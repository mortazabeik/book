import base64
import json
import sys
import wave
from io import BytesIO

MODEL = 'public/models/mana-persian-piper/fa_IR-mana-medium.onnx'


def main():
    try:
        from piper import PiperVoice
    except ImportError as exc:
        raise RuntimeError('Python Piper is not installed. Install piper-tts in the Electron environment.') from exc
    voice = PiperVoice.load(MODEL)
    for line in sys.stdin:
        request = json.loads(line)
        output = BytesIO()
        with wave.open(output, 'wb') as wav:
            voice.synthesize(request['text'], wav)
        print(json.dumps({'audio': 'data:audio/wav;base64,' + base64.b64encode(output.getvalue()).decode()}), flush=True)


if __name__ == '__main__':
    main()
