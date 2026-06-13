export async function shareRoom(room) {
  const slug = room.slug || room.id;
  const url = `${window.location.origin}/#/rooms/${encodeURIComponent(slug)}`;
  const shareData = {
    title: `${room.title} on RentPE`,
    text: `Check out this room on RentPE: ${room.title}`,
    url,
  };

  if (navigator.share) {
    await navigator.share(shareData);
    return "shared";
  }

  await copyText(url);
  return "copied";
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for browsers that block clipboard outside secure user gestures.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}
