const padTwoDigits = (value: number) => value.toString().padStart(2, '0');

export const formatRecordingDuration = (totalSeconds: number): string => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return hours > 0
    ? `${hours}:${padTwoDigits(minutes)}:${padTwoDigits(remainingSeconds)}`
    : `${padTwoDigits(minutes)}:${padTwoDigits(remainingSeconds)}`;
};
