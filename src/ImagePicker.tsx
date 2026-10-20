import { useEffect, useRef, useState } from "react";
import { imageUrl, type Item } from "./inventory";
async function prepareImage(file: File) {
  if (file.size > 20 * 1024 * 1024)
    throw Error(
      "La imagen supera 20 MB. Selecciona una fotografía más pequeña.",
    );
  if (
    file.type &&
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw Error("Selecciona una fotografía JPG, PNG o WebP.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw Error(
      "No se puede abrir esta imagen. Selecciona una fotografía JPG, PNG o WebP válida.",
    );
  }
  try {
    let result = "";
    for (const max of [1024, 800, 600, 512]) {
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw Error("El navegador no puede preparar esta fotografía.");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      result = canvas.toDataURL("image/jpeg", max === 512 ? 0.65 : 0.75);
      if (result.length <= 220000) return result;
    }
    throw Error(
      "No se ha podido reducir esta imagen. Selecciona otra fotografía.",
    );
  } finally {
    bitmap.close();
  }
}
export default function ImagePicker({
  value,
  items,
  onChange,
  onBusy,
}: {
  value?: string | null;
  items: Item[];
  onChange: (image: string | null) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [showGallery, setShowGallery] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const choices = [
    ...new Map(items.filter((i) => i.image).map((i) => [i.image, i])).values(),
  ];
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    onBusy(true);
    try {
      const photo = await prepareImage(file);
      if (alive.current) {
        onChange(photo);
        setShowGallery(false);
      }
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : "No se pudo cargar la imagen.",
        );
    } finally {
      if (alive.current) {
        setBusy(false);
        onBusy(false);
      }
    }
  }
  return (
    <section className="image-picker" aria-labelledby="image-picker-title">
      <h3 id="image-picker-title">Fotografía</h3>
      {value && (
        <img
          className="upload-preview"
          src={imageUrl(value)}
          alt="Vista previa del nuevo mobiliario"
        />
      )}
      <label className="upload-label">
        Seleccionar foto de la galería o del equipo
        <input
          type="file"
          aria-label="Subir foto del mobiliario"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void upload(file);
          }}
        />
      </label>
      <div className="image-actions">
        <button
          className="secondary"
          type="button"
          disabled={busy || !choices.length}
          onClick={() => setShowGallery(!showGallery)}
        >
          {showGallery
            ? "Cerrar galería del inventario"
            : "Usar foto del inventario"}
        </button>
        {value && (
          <button
            className="link danger"
            type="button"
            disabled={busy}
            onClick={() => {
              onChange(null);
              setError("");
            }}
          >
            Quitar foto
          </button>
        )}
      </div>
      {showGallery && (
        <div className="image-options" aria-label="Fotografías del inventario">
          {choices.map((i) => (
            <button
              type="button"
              className="image-option"
              key={i.image}
              aria-label={"Seleccionar imagen de " + i.name}
              title={i.name}
              onClick={() => {
                onChange(i.image!);
                setShowGallery(false);
                setError("");
              }}
            >
              <img src={imageUrl(i.image!)} alt={i.name} loading="lazy" />
              <span>{i.name}</span>
            </button>
          ))}
        </div>
      )}
      {busy && <p role="status">Preparando fotografía…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p className="field-help">
        JPG, PNG o WebP. Se prepara una copia ligera y se guarda con el registro
        en este navegador. La foto no se podrá editar después del alta.
      </p>
    </section>
  );
}
