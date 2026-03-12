from importlib.metadata import version, PackageNotFoundError

try:
    __version__ = version("comfyui-lite-frontend")
except PackageNotFoundError:
    __version__ = "unknown"
