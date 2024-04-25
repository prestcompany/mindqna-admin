export default async function convertBase64ToFile(input: string) {
  const result = await fetch(input).then((res) => res.blob());

  return result;
}
