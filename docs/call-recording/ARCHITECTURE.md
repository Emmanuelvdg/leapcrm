# In-app call recording and transcription

Record a meeting or upload a recording from a person, company or opportunity page, and get a timestamped transcript on the recording.

## What users see

- **Record meeting** action on person, company and opportunity record pages. It opens a side panel that records the microphone in the browser (pause, resume, stop) or takes an uploaded audio or video file.
- Saving creates a `callRecording` linked to that record, with the audio in its `audio` field.
- The record's Home tab lists its **Call Recordings**. Each recording has a **Transcript** tab with an audio player and the transcript, which appears once transcription finishes.

Phone browsers stop recording when the screen locks, so long in-person meetings are better recorded with the phone's voice recorder and uploaded.

## How it works

1. The front uploads the file to `callRecording.audio`, then creates the record with `status = PROCESSING` and `transcript = { status: 'PENDING' }`, plus `personId`, `companyId` or `opportunityId`.
2. `CallRecordingTranscriptionListener` sees the create and queues `TranscribeCallRecordingJob` on `call-recording-queue`. That queue runs one job at a time, because a self-hosted model is CPU heavy.
3. `CallRecordingTranscriptionService` sends the audio to `POST {TRANSCRIPTION_API_URL}/audio/transcriptions` (OpenAI format, `verbose_json`).
4. Each returned segment becomes a transcript entry in the same raw shape the meeting-bot app stores, so the existing transcript widget renders it.
5. The service sets `status = COMPLETED`, or `FAILED` with `transcript = { status: 'FAILED', reason }`. The reason is shown in the widget.

Recordings with an `externalBotId` come from the Recall.ai call recorder app and are left alone.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `TRANSCRIPTION_API_URL` | `http://speaches:8000/v1` in docker-compose | Transcription is off when empty |
| `TRANSCRIPTION_API_KEY` | empty | Not needed for Speaches |
| `TRANSCRIPTION_MODEL` | `Systran/faster-whisper-small` | Multilingual Whisper. Use `whisper-1` with OpenAI |

The default engine is [Speaches](https://github.com/speaches-ai/speaches) (MIT), which runs faster-whisper with OpenAI's MIT-licensed Whisper weights. It runs as the `speaches` service in `docker-compose.yml` and is reachable only on the internal network.
- **First use:** the model is not installed, so the server downloads it automatically (about 500 MB, stored in the `speaches-models` volume) and then retries.
- **Speed:** on CPU, the small model transcribes at roughly real time or slower. A 1-hour meeting can take as long as the meeting.
- **Memory:** it uses about 1 GB of RAM while loaded.

Because the URL comes from server config, the request uses the internal HTTP client rather than the SSRF-safe one, which blocks private Docker addresses.

## Upgrade

The 2.33 workspace command `upgrade:2-33:add-in-app-call-recording` adds the following to existing workspaces:
- the relations and their indexes
- the fields on the recording page
- the Call Recordings widgets and the Transcript tab
- the Record meeting action

It needs no instance command and no feature flag.

## Not in this version

- Speaker labels (diarization)
- AI summaries
- Filling deal fields from the transcript
- Meeting bots

The `summary` field and widget already exist for a later phase.
