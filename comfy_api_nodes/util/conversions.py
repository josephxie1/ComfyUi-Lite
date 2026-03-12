import base64
import logging
import math
import mimetypes
import uuid
from io import BytesIO

import av
import numpy as np
from PIL import Image

from comfy_api.latest import Input, InputImpl, Types

from ._helpers import mimetype_to_extension


def bytesio_to_image_tensor(image_bytesio: BytesIO, mode: str = "RGBA") -> np.ndarray:
    """Converts image data from BytesIO to a numpy ndarray.

    Args:
        image_bytesio: BytesIO object containing the image data.
        mode: The PIL mode to convert the image to (e.g., "RGB", "RGBA").

    Returns:
        A numpy ndarray representing the image (1, H, W, C), float32 in [0, 1].

    Raises:
        PIL.UnidentifiedImageError: If the image data cannot be identified.
        ValueError: If the specified mode is invalid.
    """
    image = Image.open(image_bytesio)
    image = image.convert(mode)
    image_array = np.array(image).astype(np.float32) / 255.0
    return image_array[np.newaxis, ...]  # (1, H, W, C)


def image_tensor_pair_to_batch(image1: np.ndarray, image2: np.ndarray) -> np.ndarray:
    """
    Converts a pair of image arrays to a batch array.
    If the images are not the same size, the smaller image is resized to
    match the larger image.
    """
    if image1.shape[1:] != image2.shape[1:]:
        target_h, target_w = image1.shape[1], image1.shape[2]
        image2 = _resize_image_array(image2, target_w, target_h)
    return np.concatenate((image1, image2), axis=0)


def tensor_to_bytesio(
    image: np.ndarray,
    *,
    total_pixels: int | None = 2048 * 2048,
    mime_type: str | None = "image/png",
) -> BytesIO:
    """Converts a numpy ndarray image to a named BytesIO object.

    Args:
        image: Input numpy ndarray image (B,H,W,C) or (H,W,C), float32 in [0,1].
        total_pixels: Maximum total pixels for downscaling. If None, no downscaling is performed.
        mime_type: Target image MIME type (e.g., 'image/png', 'image/jpeg', 'image/webp').

    Returns:
        Named BytesIO object containing the image data, with pointer set to the start of buffer.
    """
    if not mime_type:
        mime_type = "image/png"

    pil_image = tensor_to_pil(image, total_pixels=total_pixels)
    img_binary = pil_to_bytesio(pil_image, mime_type=mime_type)
    img_binary.name = f"{uuid.uuid4()}.{mimetype_to_extension(mime_type)}"
    return img_binary


def tensor_to_pil(image: np.ndarray, total_pixels: int | None = 2048 * 2048) -> Image.Image:
    """Converts a single numpy ndarray image [H, W, C] or [B, H, W, C] to a PIL Image, optionally downscaling."""
    if len(image.shape) > 3:
        image = image[0]
    if total_pixels is not None:
        image = _downscale_array(image, total_pixels=total_pixels)
    image_np = (image * 255).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(image_np)
    return img


def tensor_to_base64_string(
    image_tensor: np.ndarray,
    total_pixels: int | None = 2048 * 2048,
    mime_type: str = "image/png",
) -> str:
    """Convert [B, H, W, C] or [H, W, C] ndarray to a base64 string.

    Args:
        image_tensor: Input numpy ndarray image.
        total_pixels: Maximum total pixels for downscaling. If None, no downscaling is performed.
        mime_type: Target image MIME type (e.g., 'image/png', 'image/jpeg', 'image/webp').

    Returns:
        Base64 encoded string of the image.
    """
    pil_image = tensor_to_pil(image_tensor, total_pixels=total_pixels)
    img_byte_arr = pil_to_bytesio(pil_image, mime_type=mime_type)
    img_bytes = img_byte_arr.getvalue()
    base64_encoded_string = base64.b64encode(img_bytes).decode("utf-8")
    return base64_encoded_string


def pil_to_bytesio(img: Image.Image, mime_type: str = "image/png") -> BytesIO:
    """Converts a PIL Image to a BytesIO object."""
    if not mime_type:
        mime_type = "image/png"

    img_byte_arr = BytesIO()
    pil_format = mime_type.split("/")[-1].upper()
    if pil_format == "JPG":
        pil_format = "JPEG"
    img.save(img_byte_arr, format=pil_format)
    img_byte_arr.seek(0)
    return img_byte_arr


def _downscale_array(image: np.ndarray, total_pixels: int = 1536 * 1024) -> np.ndarray:
    """Downscale a single image array [H, W, C] to roughly the specified total pixels using PIL."""
    h, w = image.shape[0], image.shape[1]
    current_pixels = h * w
    if current_pixels <= total_pixels:
        return image
    scale = math.sqrt(total_pixels / current_pixels)
    new_w = round(w * scale)
    new_h = round(h * scale)
    pil_img = Image.fromarray((image * 255).clip(0, 255).astype(np.uint8))
    pil_img = pil_img.resize((new_w, new_h), Image.LANCZOS)
    return np.array(pil_img).astype(np.float32) / 255.0


def _resize_image_array(image: np.ndarray, target_w: int, target_h: int) -> np.ndarray:
    """Resize a batch image array [B, H, W, C] to target dimensions using PIL."""
    batch_size = image.shape[0]
    results = []
    for i in range(batch_size):
        pil_img = Image.fromarray((image[i] * 255).clip(0, 255).astype(np.uint8))
        pil_img = pil_img.resize((target_w, target_h), Image.LANCZOS)
        results.append(np.array(pil_img).astype(np.float32) / 255.0)
    return np.stack(results, axis=0)


def downscale_image_tensor(image: np.ndarray, total_pixels: int = 1536 * 1024) -> np.ndarray:
    """Downscale input image array to roughly the specified total pixels."""
    if len(image.shape) > 3:
        # batch: process first image to check if scaling needed
        h, w = image.shape[1], image.shape[2]
        current_pixels = h * w
        if current_pixels <= total_pixels:
            return image
        scale = math.sqrt(total_pixels / current_pixels)
        new_w = round(w * scale)
        new_h = round(h * scale)
        return _resize_image_array(image, new_w, new_h)
    else:
        return _downscale_array(image, total_pixels=total_pixels)


def downscale_image_tensor_by_max_side(image: np.ndarray, *, max_side: int) -> np.ndarray:
    """Downscale input image array so the largest dimension is at most max_side pixels."""
    if len(image.shape) > 3:
        h, w = image.shape[1], image.shape[2]
    else:
        h, w = image.shape[0], image.shape[1]

    max_dim = max(w, h)
    if max_dim <= max_side:
        return image
    scale = max_side / max_dim
    new_w = round(w * scale)
    new_h = round(h * scale)

    if len(image.shape) > 3:
        return _resize_image_array(image, new_w, new_h)
    else:
        return _downscale_array(image, total_pixels=new_w * new_h)


def tensor_to_data_uri(
    image_tensor: np.ndarray,
    total_pixels: int | None = 2048 * 2048,
    mime_type: str = "image/png",
) -> str:
    """Converts a ndarray image to a Data URI string.

    Args:
        image_tensor: Input numpy ndarray image.
        total_pixels: Maximum total pixels for downscaling. If None, no downscaling is performed.
        mime_type: Target image MIME type (e.g., 'image/png', 'image/jpeg', 'image/webp').

    Returns:
        Data URI string (e.g., 'data:image/png;base64,...').
    """
    base64_string = tensor_to_base64_string(image_tensor, total_pixels, mime_type)
    return f"data:{mime_type};base64,{base64_string}"


# ── Audio functions ────────────────


def audio_to_base64_string(audio: Input.Audio, container_format: str = "mp4", codec_name: str = "aac") -> str:
    """Converts an audio input to a base64 string."""
    sample_rate: int = audio["sample_rate"]
    waveform = audio["waveform"]
    audio_data_np = audio_tensor_to_contiguous_ndarray(waveform)
    audio_bytes_io = audio_ndarray_to_bytesio(audio_data_np, sample_rate, container_format, codec_name)
    audio_bytes = audio_bytes_io.getvalue()
    return base64.b64encode(audio_bytes).decode("utf-8")


def video_to_base64_string(
    video: Input.Video,
    container_format: Types.VideoContainer | None = None,
    codec: Types.VideoCodec | None = None,
) -> str:
    """
    Converts a video input to a base64 string.

    Args:
        video: The video input to convert
        container_format: Optional container format to use (defaults to video.container if available)
        codec: Optional codec to use (defaults to video.codec if available)
    """
    video_bytes_io = BytesIO()
    video.save_to(
        video_bytes_io,
        format=container_format or getattr(video, "container", Types.VideoContainer.MP4),
        codec=codec or getattr(video, "codec", Types.VideoCodec.H264),
    )
    video_bytes_io.seek(0)
    return base64.b64encode(video_bytes_io.getvalue()).decode("utf-8")


def audio_ndarray_to_bytesio(
    audio_data_np: np.ndarray,
    sample_rate: int,
    container_format: str = "mp4",
    codec_name: str = "aac",
) -> BytesIO:
    """
    Encodes a numpy array of audio data into a BytesIO object.
    """
    audio_bytes_io = BytesIO()
    with av.open(audio_bytes_io, mode="w", format=container_format) as output_container:
        audio_stream = output_container.add_stream(codec_name, rate=sample_rate)
        frame = av.AudioFrame.from_ndarray(
            audio_data_np,
            format="fltp",
            layout="stereo" if audio_data_np.shape[0] > 1 else "mono",
        )
        frame.sample_rate = sample_rate
        frame.pts = 0

        for packet in audio_stream.encode(frame):
            output_container.mux(packet)

        # Flush stream
        for packet in audio_stream.encode(None):
            output_container.mux(packet)

    audio_bytes_io.seek(0)
    return audio_bytes_io


def audio_tensor_to_contiguous_ndarray(waveform) -> np.ndarray:
    """
    Prepares audio waveform for av library by converting to a contiguous numpy array.

    Args:
        waveform: an array/tensor of shape (1, channels, samples) derived from a Comfy `AUDIO` type.

    Returns:
        Contiguous numpy array of the audio waveform. If the audio was batched,
            the first item is taken.
    """
    if waveform.ndim != 3 or waveform.shape[0] != 1:
        raise ValueError("Expected waveform shape (1, channels, samples)")

    # If batch is > 1, take first item
    if waveform.shape[0] > 1:
        waveform = waveform[0]

    # Remove batch dim, ensure contiguous numpy array
    audio_data_np = np.ascontiguousarray(np.squeeze(np.asarray(waveform), axis=0))
    if audio_data_np.dtype != np.float32:
        audio_data_np = audio_data_np.astype(np.float32)

    return audio_data_np


def audio_input_to_mp3(audio: Input.Audio) -> BytesIO:
    waveform = audio["waveform"]

    output_buffer = BytesIO()
    output_container = av.open(output_buffer, mode="w", format="mp3")

    out_stream = output_container.add_stream("libmp3lame", rate=audio["sample_rate"])
    out_stream.bit_rate = 320000

    audio_np = np.moveaxis(np.asarray(waveform, dtype=np.float32), 0, 1).reshape(1, -1)

    layout = "mono" if waveform.shape[0] == 1 else "stereo"
    frame = av.AudioFrame.from_ndarray(
        audio_np,
        format="flt",
        layout=layout,
    )
    frame.sample_rate = audio["sample_rate"]
    frame.pts = 0
    output_container.mux(out_stream.encode(frame))
    output_container.mux(out_stream.encode(None))
    output_container.close()
    output_buffer.seek(0)
    return output_buffer


def trim_video(video: Input.Video, duration_sec: float) -> Input.Video:
    """
    Returns a new VideoInput object trimmed from the beginning to the specified duration,
    using av to avoid loading entire video into memory.

    Args:
        video: Input video to trim
        duration_sec: Duration in seconds to keep from the beginning

    Returns:
        VideoFromFile object that owns the output buffer
    """
    output_buffer = BytesIO()
    input_container = None
    output_container = None

    try:
        # Get the stream source - this avoids loading entire video into memory
        # when the source is already a file path
        input_source = video.get_stream_source()

        # Open containers
        input_container = av.open(input_source, mode="r")
        output_container = av.open(output_buffer, mode="w", format="mp4")

        # Set up output streams for re-encoding
        video_stream = None
        audio_stream = None

        for stream in input_container.streams:
            logging.info("Found stream: type=%s, class=%s", stream.type, type(stream))
            if isinstance(stream, av.VideoStream):
                # Create output video stream with same parameters
                video_stream = output_container.add_stream("h264", rate=stream.average_rate)
                video_stream.width = stream.width
                video_stream.height = stream.height
                video_stream.pix_fmt = "yuv420p"
                logging.info("Added video stream: %sx%s @ %sfps", stream.width, stream.height, stream.average_rate)
            elif isinstance(stream, av.AudioStream):
                # Create output audio stream with same parameters
                audio_stream = output_container.add_stream("aac", rate=stream.sample_rate)
                audio_stream.sample_rate = stream.sample_rate
                audio_stream.layout = stream.layout
                logging.info("Added audio stream: %sHz, %s channels", stream.sample_rate, stream.channels)

        # Calculate target frame count that's divisible by 16
        fps = input_container.streams.video[0].average_rate
        estimated_frames = int(duration_sec * fps)
        target_frames = (estimated_frames // 16) * 16  # Round down to nearest multiple of 16

        if target_frames == 0:
            raise ValueError("Video too short: need at least 16 frames for Moonvalley")

        frame_count = 0
        audio_frame_count = 0

        # Decode and re-encode video frames
        if video_stream:
            for frame in input_container.decode(video=0):
                if frame_count >= target_frames:
                    break

                # Re-encode frame
                for packet in video_stream.encode(frame):
                    output_container.mux(packet)
                frame_count += 1

            # Flush encoder
            for packet in video_stream.encode():
                output_container.mux(packet)

            logging.info("Encoded %s video frames (target: %s)", frame_count, target_frames)

        # Decode and re-encode audio frames
        if audio_stream:
            input_container.seek(0)  # Reset to beginning for audio
            for frame in input_container.decode(audio=0):
                if frame.time >= duration_sec:
                    break

                # Re-encode frame
                for packet in audio_stream.encode(frame):
                    output_container.mux(packet)
                audio_frame_count += 1

            # Flush encoder
            for packet in audio_stream.encode():
                output_container.mux(packet)

            logging.info("Encoded %s audio frames", audio_frame_count)

        # Close containers
        output_container.close()
        input_container.close()

        # Return as VideoFromFile using the buffer
        output_buffer.seek(0)
        return InputImpl.VideoFromFile(output_buffer)

    except Exception as e:
        # Clean up on error
        if input_container is not None:
            input_container.close()
        if output_container is not None:
            output_container.close()
        raise RuntimeError(f"Failed to trim video: {str(e)}") from e


def _f32_pcm(wav: np.ndarray) -> np.ndarray:
    """Convert audio to float 32 bits PCM format. Copy-paste from nodes_audio.py file."""
    if np.issubdtype(wav.dtype, np.floating):
        return wav.astype(np.float32)
    elif wav.dtype == np.int16:
        return wav.astype(np.float32) / (2**15)
    elif wav.dtype == np.int32:
        return wav.astype(np.float32) / (2**31)
    raise ValueError(f"Unsupported wav dtype: {wav.dtype}")


def audio_bytes_to_audio_input(audio_bytes: bytes) -> dict:
    """
    Decode any common audio container from bytes using PyAV and return
    a Comfy AUDIO dict: {"waveform": [1, C, T] float32, "sample_rate": int}.
    """
    with av.open(BytesIO(audio_bytes)) as af:
        if not af.streams.audio:
            raise ValueError("No audio stream found in response.")
        stream = af.streams.audio[0]

        in_sr = int(stream.codec_context.sample_rate)
        out_sr = in_sr

        frames: list[np.ndarray] = []
        n_channels = stream.channels or 1

        for frame in af.decode(streams=stream.index):
            arr = frame.to_ndarray()  # shape can be [C, T] or [T, C] or [T]
            buf = arr
            if buf.ndim == 1:
                buf = buf[np.newaxis, :]  # [T] -> [1, T]
            elif buf.shape[0] != n_channels and buf.shape[-1] == n_channels:
                buf = np.ascontiguousarray(buf.T)  # [T, C] -> [C, T]
            elif buf.shape[0] != n_channels:
                buf = np.ascontiguousarray(buf.reshape(-1, n_channels).T)  # fallback to [C, T]
            frames.append(buf)

    if not frames:
        raise ValueError("Decoded zero audio frames.")

    wav = np.concatenate(frames, axis=1)  # [C, T]
    wav = _f32_pcm(wav)
    return {"waveform": np.ascontiguousarray(wav[np.newaxis, ...]), "sample_rate": out_sr}


def resize_mask_to_image(
    mask: np.ndarray,
    image: np.ndarray,
    upscale_method="nearest-exact",
    crop="disabled",
    allow_gradient=True,
    add_channel_dim=False,
) -> np.ndarray:
    """Resize mask to be the same dimensions as an image, while maintaining proper format for API calls."""
    _, target_h, target_w, _ = image.shape
    batch_size = mask.shape[0]
    results = []
    for i in range(batch_size):
        # mask shape: (B, H, W), take single mask
        pil_mask = Image.fromarray((mask[i] * 255).clip(0, 255).astype(np.uint8), mode='L')
        resample = Image.NEAREST if upscale_method == "nearest-exact" else Image.LANCZOS
        pil_mask = pil_mask.resize((target_w, target_h), resample)
        mask_arr = np.array(pil_mask).astype(np.float32) / 255.0
        if not allow_gradient:
            mask_arr = (mask_arr > 0.5).astype(np.float32)
        if add_channel_dim:
            mask_arr = mask_arr[..., np.newaxis]
        results.append(mask_arr)
    if add_channel_dim:
        return np.stack(results, axis=0)
    else:
        return np.stack(results, axis=0)


def convert_mask_to_image(mask: np.ndarray) -> np.ndarray:
    """Make mask have the expected amount of dims (4) and channels (3) to be recognized as an image."""
    if mask.ndim == 3:
        # (B, H, W) -> (B, H, W, 3)
        return np.repeat(mask[..., np.newaxis], 3, axis=-1)
    elif mask.ndim == 2:
        # (H, W) -> (1, H, W, 3)
        return np.repeat(mask[np.newaxis, ..., np.newaxis], 3, axis=-1)
    return mask


def text_filepath_to_base64_string(filepath: str) -> str:
    """Converts a text file to a base64 string."""
    with open(filepath, "rb") as f:
        file_content = f.read()
    return base64.b64encode(file_content).decode("utf-8")


def text_filepath_to_data_uri(filepath: str) -> str:
    """Converts a text file to a data URI."""
    base64_string = text_filepath_to_base64_string(filepath)
    mime_type, _ = mimetypes.guess_type(filepath)
    if mime_type is None:
        mime_type = "application/octet-stream"
    return f"data:{mime_type};base64,{base64_string}"
