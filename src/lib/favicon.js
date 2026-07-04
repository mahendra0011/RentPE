export function updateFaviconBadge(count) {
  const favicon =
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]');
  if (!favicon) return;

  if (!count || count <= 0) {
    favicon.href = "/favicon.ico";
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = "/favicon.ico";
  img.onload = () => {
    ctx.drawImage(img, 0, 0, 32, 32);

    ctx.beginPath();
    ctx.arc(24, 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(count > 9 ? "9+" : String(count), 24, 9);

    favicon.href = canvas.toDataURL();
  };
}
