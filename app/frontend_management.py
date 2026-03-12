from __future__ import annotations
import argparse
import logging
import os
import re
import sys
import tempfile
import zipfile
import importlib
from dataclasses import dataclass
from functools import cached_property
from pathlib import Path
from typing import Dict, TypedDict, Optional
from aiohttp import web
from importlib.metadata import version

import requests
from typing_extensions import NotRequired

from utils.install_util import get_missing_requirements_message, get_required_packages_versions

from comfy.cli_args import DEFAULT_VERSION_STRING
import app.logger


def frontend_install_warning_message():
    return f"""
{get_missing_requirements_message()}

This error is happening because the ComfyUI frontend is no longer shipped as part of the main repo but as a pip package instead.
""".strip()

def parse_version(version: str) -> tuple[int, int, int]:
        return tuple(map(int, version.split(".")))

def is_valid_version(version: str) -> bool:
    """Validate if a string is a valid semantic version (X.Y.Z format)."""
    pattern = r"^(\d+)\.(\d+)\.(\d+)$"
    return bool(re.match(pattern, version))

def get_installed_frontend_version():
    """Get the currently installed frontend package version."""
    try:
        return version("comfyui-lite-frontend")
    except Exception:
        pass
    try:
        return version("comfyui-frontend-package")
    except Exception:
        return "0.0.0"


def get_required_frontend_version():
    req = get_required_packages_versions().get("comfyui-frontend-package", None)
    return req or "0.0.0"


def check_frontend_version():
    """Check if the frontend version is up to date."""

    try:
        frontend_version_str = get_installed_frontend_version()
        frontend_version = parse_version(frontend_version_str)
        required_frontend_str = get_required_frontend_version()
        required_frontend = parse_version(required_frontend_str)
        if frontend_version < required_frontend:
            app.logger.log_startup_warning(
                f"""
________________________________________________________________________
WARNING WARNING WARNING WARNING WARNING

Installed frontend version {".".join(map(str, frontend_version))} is lower than the recommended version {".".join(map(str, required_frontend))}.

{frontend_install_warning_message()}
________________________________________________________________________
""".strip()
            )
        else:
            logging.info("ComfyUI frontend version: {}".format(frontend_version_str))
    except Exception as e:
        logging.error(f"Failed to check frontend version: {e}")


REQUEST_TIMEOUT = 10  # seconds


class Asset(TypedDict):
    url: str


class Release(TypedDict):
    id: int
    tag_name: str
    name: str
    prerelease: bool
    created_at: str
    published_at: str
    body: str
    assets: NotRequired[list[Asset]]


@dataclass
class FrontEndProvider:
    owner: str
    repo: str

    @property
    def folder_name(self) -> str:
        return f"{self.owner}_{self.repo}"

    @property
    def release_url(self) -> str:
        return f"https://api.github.com/repos/{self.owner}/{self.repo}/releases"

    @cached_property
    def all_releases(self) -> list[Release]:
        releases = []
        api_url = self.release_url
        while api_url:
            response = requests.get(api_url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()  # Raises an HTTPError if the response was an error
            releases.extend(response.json())
            # GitHub uses the Link header to provide pagination links. Check if it exists and update api_url accordingly.
            if "next" in response.links:
                api_url = response.links["next"]["url"]
            else:
                api_url = None
        return releases

    @cached_property
    def latest_release(self) -> Release:
        latest_release_url = f"{self.release_url}/latest"
        response = requests.get(latest_release_url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()  # Raises an HTTPError if the response was an error
        return response.json()

    @cached_property
    def latest_prerelease(self) -> Release:
        """Get the latest pre-release version - even if it's older than the latest release"""
        release = [release for release in self.all_releases if release["prerelease"]]

        if not release:
            raise ValueError("No pre-releases found")

        # GitHub returns releases in reverse chronological order, so first is latest
        return release[0]

    def get_release(self, version: str) -> Release:
        if version == "latest":
            return self.latest_release
        elif version == "prerelease":
            return self.latest_prerelease
        else:
            for release in self.all_releases:
                if release["tag_name"] in [version, f"v{version}"]:
                    return release
            raise ValueError(f"Version {version} not found in releases")


def download_release_asset_zip(release: Release, destination_path: str) -> None:
    """Download dist.zip from github release."""
    asset_url = None
    for asset in release.get("assets", []):
        if asset["name"] == "dist.zip":
            asset_url = asset["url"]
            break

    if not asset_url:
        raise ValueError("dist.zip not found in the release assets")

    # Use a temporary file to download the zip content
    with tempfile.TemporaryFile() as tmp_file:
        headers = {"Accept": "application/octet-stream"}
        response = requests.get(
            asset_url, headers=headers, allow_redirects=True, timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()  # Ensure we got a successful response

        # Write the content to the temporary file
        tmp_file.write(response.content)

        # Go back to the beginning of the temporary file
        tmp_file.seek(0)

        # Extract the zip file content to the destination path
        with zipfile.ZipFile(tmp_file, "r") as zip_ref:
            zip_ref.extractall(destination_path)


class FrontendManager:
    CUSTOM_FRONTENDS_ROOT = str(Path(__file__).parents[1] / "web_custom_versions")

    @classmethod
    def get_required_frontend_version(cls) -> str:
        """Get the required frontend package version."""
        return get_required_frontend_version()

    @classmethod
    def get_installed_templates_version(cls) -> str:
        """Get the currently installed workflow templates package version."""
        try:
            templates_version_str = version("comfyui-workflow-templates-core")
            return templates_version_str
        except Exception:
            return None

    @classmethod
    def get_required_templates_version(cls) -> str:
        return get_required_packages_versions().get("comfyui-workflow-templates", None)

    @classmethod
    def default_frontend_path(cls) -> str:
        try:
            import comfyui_frontend_package

            return str(importlib.resources.files(comfyui_frontend_package) / "static")
        except ImportError:
            logging.error(
                f"""
********** ERROR ***********

comfyui-frontend-package is not installed.

{frontend_install_warning_message()}

********** ERROR ***********
""".strip()
            )
            sys.exit(-1)

    @classmethod
    def template_asset_map(cls) -> Optional[Dict[str, str]]:
        """Return a mapping of template asset names to their absolute paths."""
        try:
            from comfyui_workflow_templates_core.loader import (
                get_asset_path,
                iter_templates,
            )
        except ImportError:
            logging.warning(
                "comfyui-workflow-templates-core is not installed. No templates will be available."
            )
            return None

        try:
            template_entries = list(iter_templates())
        except Exception as exc:
            logging.error(f"Failed to enumerate workflow templates: {exc}")
            return None

        asset_map: Dict[str, str] = {}
        for entry in template_entries:
            for asset in entry.assets:
                try:
                    asset_map[asset.filename] = get_asset_path(
                        entry.template_id, asset.filename
                    )
                except (FileNotFoundError, KeyError) as exc:
                    # Skip templates whose media packages are not installed
                    logging.debug(f"Skipping template asset {asset.filename}: {exc}")
                    continue

        if not asset_map:
            logging.warning("No workflow template assets found. Did the packages install correctly?")
            return None

        return asset_map


    @classmethod
    def legacy_templates_path(cls) -> Optional[str]:
        """Return the legacy templates directory shipped inside the meta package."""
        try:
            import comfyui_workflow_templates_core

            return str(
                importlib.resources.files(comfyui_workflow_templates_core) / "templates"
            )
        except ImportError:
            logging.debug("comfyui-workflow-templates-core is not installed.")
            return None

    @classmethod
    def embedded_docs_path(cls) -> str:
        """Get the path to embedded documentation"""
        try:
            import comfyui_embedded_docs

            return str(
                importlib.resources.files(comfyui_embedded_docs) / "docs"
            )
        except ImportError:
            logging.info("comfyui-embedded-docs package not found")
            return None

    @classmethod
    def parse_version_string(cls, value: str) -> tuple[str, str, str]:
        """
        Args:
            value (str): The version string to parse.

        Returns:
            tuple[str, str]: A tuple containing provider name and version.

        Raises:
            argparse.ArgumentTypeError: If the version string is invalid.
        """
        VERSION_PATTERN = r"^([a-zA-Z0-9][a-zA-Z0-9-]{0,38})/([a-zA-Z0-9_.-]+)@(v?\d+\.\d+\.\d+[-._a-zA-Z0-9]*|latest|prerelease)$"
        match_result = re.match(VERSION_PATTERN, value)
        if match_result is None:
            raise argparse.ArgumentTypeError(f"Invalid version string: {value}")

        return match_result.group(1), match_result.group(2), match_result.group(3)

    @classmethod
    def init_frontend_unsafe(
        cls, version_string: str, provider: Optional[FrontEndProvider] = None
    ) -> str:
        """
        Initializes the frontend for the specified version.

        Args:
            version_string (str): The version string.
            provider (FrontEndProvider, optional): The provider to use. Defaults to None.

        Returns:
            str: The path to the initialized frontend.

        Raises:
            Exception: If there is an error during the initialization process.
            main error source might be request timeout or invalid URL.
        """
        if version_string == DEFAULT_VERSION_STRING:
            check_frontend_version()
            return cls.default_frontend_path()

        repo_owner, repo_name, version = cls.parse_version_string(version_string)

        if version.startswith("v"):
            expected_path = str(
                Path(cls.CUSTOM_FRONTENDS_ROOT)
                / f"{repo_owner}_{repo_name}"
                / version.lstrip("v")
            )
            if os.path.exists(expected_path):
                logging.info(
                    f"Using existing copy of specific frontend version tag: {repo_owner}/{repo_name}@{version}"
                )
                return expected_path

        logging.info(
            f"Initializing frontend: {repo_owner}/{repo_name}@{version}, requesting version details from GitHub..."
        )

        provider = provider or FrontEndProvider(repo_owner, repo_name)
        release = provider.get_release(version)

        semantic_version = release["tag_name"].lstrip("v")
        web_root = str(
            Path(cls.CUSTOM_FRONTENDS_ROOT) / provider.folder_name / semantic_version
        )
        if not os.path.exists(web_root):
            try:
                os.makedirs(web_root, exist_ok=True)
                logging.info(
                    "Downloading frontend(%s) version(%s) to (%s)",
                    provider.folder_name,
                    semantic_version,
                    web_root,
                )
                logging.debug(release)
                download_release_asset_zip(release, destination_path=web_root)
            finally:
                # Clean up the directory if it is empty, i.e. the download failed
                if not os.listdir(web_root):
                    os.rmdir(web_root)

        return web_root

    @classmethod
    def init_frontend(cls, version_string: str) -> str:
        """
        Initializes the frontend with the specified version string.

        Args:
            version_string (str): The version string to initialize the frontend with.

        Returns:
            str: The path of the initialized frontend.
        """
        try:
            return cls.init_frontend_unsafe(version_string)
        except Exception as e:
            logging.error("Failed to initialize frontend: %s", e)
            logging.info("Falling back to the default frontend.")
            check_frontend_version()
            return cls.default_frontend_path()
    @classmethod
    def template_asset_handler(cls):
        assets = cls.template_asset_map()
        if not assets:
            return None

        # Build a set of available template names from asset map
        available_template_names = set()
        for filename in assets:
            # Template names are the base names without extension/suffix
            # e.g. "api_gemini_image-1.webp" -> "api_gemini_image"
            if filename.endswith('.json'):
                available_template_names.add(filename[:-5])  # strip .json

        # Try to load index.json from the workflow_templates source directory
        index_cache = {}
        templates_source_dir = Path(__file__).parents[1] / "workflow_templates" / "templates"
        for index_name in ["index.json", "index_logo.json"]:
            index_path = templates_source_dir / index_name
            if index_path.exists():
                try:
                    import json as _json
                    with open(index_path, 'r') as f:
                        data = _json.load(f)

                    if index_name == "index.json" and isinstance(data, list):
                        # Filter categories to only include templates that have available assets
                        filtered_categories = []
                        for category in data:
                            templates = category.get("templates", [])
                            filtered_templates = [
                                t for t in templates
                                if t.get("name") in available_template_names
                            ]
                            if filtered_templates:
                                cat_copy = dict(category)
                                cat_copy["templates"] = filtered_templates
                                filtered_categories.append(cat_copy)
                        index_cache[index_name] = _json.dumps(filtered_categories)
                        total = sum(len(c["templates"]) for c in filtered_categories)
                        logging.info(f"Template catalog: {total} templates in {len(filtered_categories)} categories (filtered from {len(data)})")
                    else:
                        index_cache[index_name] = _json.dumps(data)
                except Exception as exc:
                    logging.warning(f"Failed to load {index_name}: {exc}")

        async def serve_template(request: web.Request) -> web.StreamResponse:
            rel_path = request.match_info.get("path", "")

            # Serve cached catalog files (index.json, index_logo.json)
            if rel_path in index_cache:
                return web.Response(
                    text=index_cache[rel_path],
                    content_type="application/json"
                )

            # Serve individual template assets
            target = assets.get(rel_path)
            if target is None:
                raise web.HTTPNotFound()
            return web.FileResponse(target)

        return serve_template
