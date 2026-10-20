import { useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  read,
  key,
  empty,
  conditions,
  validCount,
  initialInventory,
  imageUrl,
  displayCount,
  type Item,
} from "./inventory";
import summary from "./data/import-summary.json";
import "./style.css";
function downloadFile(contents: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Photo({ item, onOpen }: { item: Item; onOpen: () => void }) {
  return item.image ? (
    <button
      className="photo-button"
      onClick={onOpen}
      aria-label={
        "Ver foto de " +
        item.name +
        (item.source ? " · fila " + item.source.row : "")
      }
    >
      <img src={imageUrl(item.image)} alt={item.name} loading="lazy" />
    </button>
  ) : (
    <span className="no-photo">Sin imagen</span>
  );
}
function App() {
  const [loadError] = useState(() => {
    try {
      read();
      return false;
    } catch {
      return true;
    }
  });
  const [items, setItems] = useState<Item[]>(() => {
    try {
      return read();
    } catch {
      return [];
    }
  });
  const [query, setQuery] = useState(""),
    [location, setLocation] = useState(""),
    [condition, setCondition] = useState(""),
    [section, setSection] = useState("");
  const [draft, setDraft] = useState<Item | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null),
    [detail, setDetail] = useState<Item | null>(null);
  const [view, setView] = useState<"table" | "gallery">("table");
  const visible = items.filter(
    (i) =>
      `${i.name} ${i.category} ${i.origin} ${i.location}`
        .toLocaleLowerCase("es")
        .includes(query.toLocaleLowerCase("es")) &&
      (!location ||
        (location === "__missing" ? !i.location : i.location === location)) &&
      (!condition ||
        (condition === "__pending"
          ? i.quantity === null || !i.location || !i.origin
          : i.condition === condition)) &&
      (!section || i.category === section),
  );
  const pending = items.filter(
    (i) => i.quantity === null || !i.location || !i.origin,
  ).length;
  function persist(next: Item[]) {
    if (loadError) return false;
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setItems(next);
      setError("");
      return true;
    } catch {
      setError(
        "No se pudieron guardar los cambios. Comprueba el espacio y los permisos del navegador.",
      );
      return false;
    }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const next = {
      ...draft,
      name: draft.name.trim(),
      origin: draft.origin.trim(),
      location: draft.location.trim(),
      notes: draft.notes.trim(),
    };
    if (
      !next.name ||
      ![next.quantity, next.sent, next.received, next.recycled].every(
        validCount,
      )
    ) {
      setError(
        "Introduce un nombre y cantidades enteras mayores o iguales a cero. Deja en blanco las cantidades desconocidas.",
      );
      return;
    }
    if (
      persist(
        items.some((i) => i.id === next.id)
          ? items.map((i) => (i.id === next.id ? next : i))
          : [...items, next],
      )
    ) {
      setDraft(null);
      setMessage("Registro guardado.");
    }
  }
  function csv() {
    const cell = (value: string | number | null) =>
      '"' +
      String(
        value === null
          ? ""
          : typeof value === "string" && /^[=+@\-\t\r\n]/.test(value)
            ? "'" + value
            : value,
      ).replaceAll('"', '""') +
      '"';
    const rows = [
      [
        "Nombre",
        "Hotel origen",
        "Hotel destino",
        "Sección",
        "Inventariadas",
        "Enviadas",
        "Recibidas",
        "Rotura",
        "Estado",
        "Comentario",
        "Fila Excel",
        "Fórmula original",
        "Imagen",
      ],
      ...visible.map((i) => [
        i.name,
        i.origin,
        i.location,
        i.category,
        i.quantity,
        i.sent,
        i.received,
        i.recycled,
        i.condition,
        i.notes,
        i.source?.row ?? "",
        i.source?.formulas.F ?? "",
        i.image ? imageUrl(i.image) : "",
      ]),
    ];
    downloadFile(
      "\uFEFF" + rows.map((r) => r.map(cell).join(";")).join("\r\n"),
      "text/csv;charset=utf-8",
      "inventario-sheraton.csv",
    );
  }
  function loadExcel() {
    const ids = new Set(items.map((i) => i.id));
    const added = initialInventory.filter((i) => !ids.has(i.id));
    if (persist([...items, ...structuredClone(added)]))
      setMessage(
        `${added.length} registros del Excel añadidos. Tus registros existentes se conservan.`,
      );
  }
  const numbers: [
    keyof Pick<Item, "quantity" | "sent" | "received" | "recycled">,
    string,
  ][] = [
    ["quantity", "Unidades"],
    ["sent", "Enviadas"],
    ["received", "Recibidas"],
    ["recycled", "Rotura / reciclaje"],
  ];
  return (
    <>
      <header>
        <a className="brand" href="./">
          <span className="seal">S</span>
          <span>
            SHERATON<small>GESTIÓN DE MOBILIARIO</small>
          </span>
        </a>
        <span className="workspace">Distribución entre hoteles</span>
      </header>
      <main>
        <div className="eyebrow">OPERACIONES · INVENTARIO Y DISTRIBUCIÓN</div>
        <div className="heading">
          <div>
            <h1>Cada pieza, en su lugar.</h1>
            <p>Fotografías, destinos y seguimiento de los traslados.</p>
          </div>
          <button
            disabled={loadError}
            onClick={() => {
              setError("");
              setDraft(empty());
            }}
          >
            ＋ Añadir mobiliario
          </button>
        </div>
        <aside className="notice">
          <strong>Excel incorporado:</strong> {summary.records} registros ·{" "}
          {summary.uniqueImages} imágenes ·{" "}
          {summary.knownUnits.toLocaleString("es-ES")} unidades conocidas y{" "}
          {summary.unknownQuantities.length} cantidades pendientes. No se han
          supuesto destinos, cantidades ni estados.
          <br />
          Los cambios se guardan solo en este navegador. Exporta una copia antes
          de cambiar de dispositivo o borrar sus datos.
        </aside>
        {(loadError || error) && (
          <p role="alert" className="error">
            {loadError
              ? "No se puede leer el inventario guardado. No se sobrescribirán tus datos. Recupera una copia o revisa el almacenamiento del navegador."
              : error}
          </p>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <section className="stats" aria-label="Resumen">
          <article>
            <span>UNIDADES INVENTARIADAS</span>
            <strong>
              {items
                .reduce((n, i) => n + (i.quantity ?? 0), 0)
                .toLocaleString("es-ES")}
            </strong>
            <small>
              {items.filter((i) => i.quantity === null).length} registros con
              cantidad pendiente
            </small>
          </article>
          <article>
            <span>HOTELES DE DESTINO</span>
            <strong>
              {new Set(items.map((i) => i.location).filter(Boolean)).size}
            </strong>
            <small>
              {items.filter((i) => !i.location).length} registros sin destino
              asignado
            </small>
          </article>
          <article>
            <span>DATOS POR COMPLETAR</span>
            <strong>{pending}</strong>
            <small>Registros sin cantidad, origen o destino</small>
          </article>
        </section>
        <section className="inventory">
          <div className="section-title">
            <h2>
              Mobiliario <span>{items.length} registros</span>
            </h2>
            <div className="toolbar">
              <button
                className="secondary"
                onClick={loadExcel}
                disabled={
                  loadError ||
                  initialInventory.every((i) =>
                    items.some((j) => i.id === j.id),
                  )
                }
              >
                Cargar datos del Excel
              </button>
              <button
                className="secondary"
                disabled={loadError}
                onClick={() =>
                  downloadFile(
                    JSON.stringify(items, null, 2),
                    "application/json",
                    "inventario-sheraton-respaldo.json",
                  )
                }
              >
                Copia JSON
              </button>
              <button
                className="secondary"
                onClick={csv}
                disabled={!visible.length}
              >
                ↓ Exportar CSV
              </button>
            </div>
          </div>
          <div className="filters">
            <input
              aria-label="Buscar mobiliario"
              placeholder="Buscar mobiliario, origen o destino…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Filtrar ubicación"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">Todos los destinos</option>
              <option value="__missing">Sin destino asignado</option>
              {[...new Set(items.map((i) => i.location).filter(Boolean))]
                .sort()
                .map((l) => (
                  <option key={l}>{l}</option>
                ))}
            </select>
            <select
              aria-label="Filtrar estado"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="__pending">Datos por completar</option>
              {conditions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Filtrar sección"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              <option value="">Todas las secciones</option>
              {[...new Set(items.map((i) => i.category))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="view-switch" aria-label="Vista del inventario">
            <button
              className="secondary"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              Tabla
            </button>
            <button
              className="secondary"
              aria-pressed={view === "gallery"}
              onClick={() => setView("gallery")}
            >
              Galería de fotos
            </button>
          </div>
          {view === "table" ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mobiliario</th>
                    <th>Origen → destino</th>
                    <th>Inventariadas</th>
                    <th>Enviadas</th>
                    <th>Recibidas</th>
                    <th>Rotura</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <div className="item-cell">
                          <Photo item={i} onOpen={() => setDetail(i)} />
                          <div>
                            <strong>{i.name}</strong>
                            <small>
                              {i.category}
                              {i.source && ` · Fila ${i.source.row}`}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <small>{i.origin || "Origen pendiente"}</small>
                        <span>{i.location || "Sin destino asignado"}</span>
                      </td>
                      <td>{displayCount(i.quantity)}</td>
                      <td>{displayCount(i.sent)}</td>
                      <td>{displayCount(i.received)}</td>
                      <td>{displayCount(i.recycled)}</td>
                      <td>
                        <span
                          className={
                            "badge status" + conditions.indexOf(i.condition)
                          }
                        >
                          {i.condition}
                        </span>
                      </td>
                      <td>
                        <button
                          className="link"
                          onClick={() => {
                            setError("");
                            setDraft({ ...i });
                          }}
                          aria-label={"Editar " + i.name}
                        >
                          Editar
                        </button>
                        <button
                          className="link danger"
                          onClick={() => setPendingDelete(i.id)}
                          aria-label={"Eliminar " + i.name}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="gallery">
              {visible.map((i) => (
                <article key={i.id}>
                  <Photo item={i} onOpen={() => setDetail(i)} />
                  <div className="card-content">
                    <small>
                      {i.category}
                      {i.source && ` · Fila ${i.source.row}`}
                    </small>
                    <h3>{i.name}</h3>
                    <p>
                      {i.origin || "Origen pendiente"} →{" "}
                      {i.location || "Sin destino"}
                    </p>
                    <p>
                      <strong>{displayCount(i.quantity)}</strong> unidades
                    </p>
                    <button className="link" onClick={() => setDetail(i)}>
                      Ver detalle
                    </button>
                    <button
                      className="link"
                      onClick={() => {
                        setError("");
                        setDraft({ ...i });
                      }}
                    >
                      Editar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {!visible.length && (
            <div className="empty">
              <span>▤</span>
              <h3>
                {items.length
                  ? "No hay coincidencias"
                  : "Un inventario comienza con una pieza"}
              </h3>
              <p>
                {items.length
                  ? "Prueba con otra búsqueda o cambia los filtros."
                  : "Añade mobiliario o carga los datos del Excel."}
              </p>
            </div>
          )}
          <footer>
            {visible.length} de {items.length} registros
            <span>
              Una fila del Excel = un registro · Sin fusionar duplicados
            </span>
          </footer>
        </section>
      </main>
      {draft && (
        <dialog
          ref={(node) => {
            if (node && !node.open) node.showModal();
          }}
          onCancel={() => setDraft(null)}
          aria-labelledby="form-title"
        >
          <form onSubmit={save}>
            <div className="section-title">
              <h2 id="form-title">
                {items.some((i) => i.id === draft.id)
                  ? "Editar mobiliario"
                  : "Nuevo mobiliario"}
              </h2>
              <button
                type="button"
                className="link"
                onClick={() => setDraft(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <label>
              Nombre
              <input
                autoFocus
                required
                maxLength={160}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Hotel origen
                <input
                  maxLength={160}
                  value={draft.origin}
                  onChange={(e) =>
                    setDraft({ ...draft, origin: e.target.value })
                  }
                />
              </label>
              <label>
                Ubicación
                <input
                  maxLength={160}
                  placeholder="Hotel destino · pendiente si está vacío"
                  value={draft.location}
                  onChange={(e) =>
                    setDraft({ ...draft, location: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Sección / categoría
              <input
                list="categories"
                required
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
              />
              <datalist id="categories">
                {[
                  ...new Set([
                    ...items.map((i) => i.category),
                    "Asientos",
                    "Mesas",
                    "Almacenaje",
                    "Camas",
                    "Iluminación",
                    "Decoración",
                    "Otros",
                  ]),
                ].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <div className="form-grid">
              {numbers.map(([field, label]) => (
                <label key={field}>
                  {label}
                  <input
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    placeholder="Pendiente"
                    value={draft[field] ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [field]:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <p className="field-help">
              Vacío significa pendiente de registrar. Cero significa ninguna
              unidad.
            </p>
            <label>
              Estado
              <select
                value={draft.condition}
                onChange={(e) =>
                  setDraft({ ...draft, condition: e.target.value })
                }
              >
                {conditions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Notas
              <textarea
                maxLength={2000}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </label>
            {draft.source && (
              <p className="field-help">
                Origen: {draft.source.sheet}, fila {draft.source.row}.{" "}
                {draft.source.formulas.F &&
                  `Fórmula original en F${draft.source.row}: ${draft.source.formulas.F}. Se conserva como referencia; no se recalcula.`}
              </p>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setDraft(null)}
              >
                Cancelar
              </button>
              <button>Guardar mobiliario</button>
            </div>
          </form>
        </dialog>
      )}
      {detail && (
        <dialog
          className="photo-dialog"
          ref={(node) => {
            if (node && !node.open) node.showModal();
          }}
          onCancel={() => setDetail(null)}
          aria-labelledby="detail-title"
        >
          <div className="section-title">
            <h2 id="detail-title">{detail.name}</h2>
            <button
              className="link"
              onClick={() => setDetail(null)}
              aria-label="Cerrar fotografía"
            >
              ✕
            </button>
          </div>
          {detail.image ? (
            <img
              className="full-photo"
              src={imageUrl(detail.image)}
              alt={detail.name}
            />
          ) : (
            <p>El Excel no contiene imagen para este registro.</p>
          )}
          <p>
            {detail.origin || "Origen pendiente"} →{" "}
            {detail.location || "Sin destino asignado"}
          </p>
          <p>
            {displayCount(detail.quantity)} unidades inventariadas ·{" "}
            {detail.condition}
          </p>
          <p>{detail.notes}</p>
          {detail.source && (
            <p>
              Excel: {detail.source.sheet}, fila {detail.source.row}
            </p>
          )}
          <button
            className="secondary"
            onClick={() => {
              setDraft({ ...detail });
              setDetail(null);
            }}
          >
            Editar este registro
          </button>
        </dialog>
      )}
      {pendingDelete && (
        <dialog
          ref={(node) => {
            if (node && !node.open) node.showModal();
          }}
          onCancel={() => setPendingDelete(null)}
          aria-labelledby="delete-title"
        >
          <h2 id="delete-title">Eliminar registro</h2>
          <p>
            Se eliminará «{items.find((i) => i.id === pendingDelete)?.name}» del
            inventario de este navegador.
          </p>
          <div className="form-actions">
            <button
              className="secondary"
              onClick={() => setPendingDelete(null)}
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (persist(items.filter((i) => i.id !== pendingDelete)))
                  setPendingDelete(null);
              }}
            >
              Confirmar eliminación
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
