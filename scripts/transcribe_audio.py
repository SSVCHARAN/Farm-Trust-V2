#!/usr/bin/env python3
"""
Farm Trust Audio Transcription Service
Universal speech recognition fallback for browsers lacking Web Speech API (like Firefox).
Converts webm/ogg/mp3/wav to 16kHz mono wav via ffmpeg, then transcribes with SpeechRecognition.
"""
import sys
import os
import json
import argparse
import subprocess
import tempfile
import speech_recognition as sr

def transcribe(input_file: str, lang: str = "te-IN"):
    if not os.path.exists(input_file):
        return {"success": False, "error": f"File not found: {input_file}"}

    # Prepare temp wav file if conversion needed
    temp_wav = None
    try:
        # Check if conversion is needed or if already 16kHz wav
        temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_wav_path = temp_wav.name
        temp_wav.close()

        # Convert to 16kHz mono 16-bit PCM wav using ffmpeg
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", input_file,
            "-ac", "1",
            "-ar", "16000",
            "-f", "wav",
            temp_wav_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            return {"success": False, "error": f"FFmpeg conversion failed: {res.stderr}"}

        recognizer = sr.Recognizer()
        with sr.AudioFile(temp_wav_path) as source:
            # Adjust for ambient noise slightly if needed
            audio_data = recognizer.record(source)

        # Recognize using Google Speech Recognition
        # Try requested language first
        target_lang = lang if lang in ["te-IN", "en-IN", "hi-IN"] else "te-IN"
        try:
            transcript = recognizer.recognize_google(audio_data, language=target_lang)
            return {"success": True, "transcript": transcript, "language": target_lang}
        except sr.UnknownValueError:
            # If nothing recognized with te-IN, try en-IN if it was te-IN, or vice-versa
            alt_lang = "en-IN" if target_lang == "te-IN" else "te-IN"
            try:
                transcript = recognizer.recognize_google(audio_data, language=alt_lang)
                return {"success": True, "transcript": transcript, "language": alt_lang}
            except Exception:
                return {"success": False, "error": "Could not understand audio"}
        except sr.RequestError as e:
            return {"success": False, "error": f"Speech recognition service error: {e}"}

    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if temp_wav_path and os.path.exists(temp_wav_path):
            try:
                os.remove(temp_wav_path)
            except Exception:
                pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcribe audio file to text")
    parser.add_argument("--input", required=True, help="Input audio file path")
    parser.add_argument("--lang", default="te-IN", help="Language code (te-IN or en-IN)")
    args = parser.parse_args()

    result = transcribe(args.input, args.lang)
    print(json.dumps(result, ensure_ascii=False))
