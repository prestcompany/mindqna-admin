/**
 * Clipboard writes that survive WebKit's transient user activation rule.
 *
 * Safari only honours a clipboard write that happens inside the activation window of
 * the gesture that triggered it, and any `await` in between consumes that window. When
 * the text has to be fetched first, hand `ClipboardItem` the pending promise so the
 * write stays attached to the original click. Engines without `clipboard.write` fall
 * back to awaiting the text and calling `writeText`, which is what they support.
 */
export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export async function copyTextFromPromise(load: () => Promise<string>): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const blob = load().then((text) => new Blob([text], { type: 'text/plain' }));
    await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
    return;
  }

  await navigator.clipboard.writeText(await load());
}
