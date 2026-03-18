type UploadFileLike = {
  name: string;
  size: number;
};

export function getCardUploaderFileMeta(file?: UploadFileLike | null) {
  if (!file) {
    return null;
  }

  const sizeInMb = file.size / (1024 * 1024);
  const sizeText = sizeInMb >= 1 ? `${sizeInMb.toFixed(2)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;

  return {
    name: file.name,
    sizeText,
  };
}
