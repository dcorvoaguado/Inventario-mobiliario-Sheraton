import { useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  read,
  key,
  empty,
  validCount,
  initialInventory,
  imageUrl,
  displayCount,
  destinations,
  sender,
  transferStatus,
  effectiveQuantity,
  normalizeSearch,
  type Item,
} from "./inventory";
import {
  Count,
  Damage,
  Destination,
  canEdit,
  type Editable,
} from "./InlineFields";
import ImagePicker from "./ImagePicker";
import PdfExport from "./PdfExport";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-500.css";
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
      aria-label={"Ver foto de " + item.name}
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
  const [detail, setDetail] = useState<Item | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resetOpen, setResetOpen] = useState(false);
  const [actor, setActor] = useState(sender);
  const [view, setView] = useState<"table" | "gallery">("table");
  const visible = items.filter(
    (i) =>
      normalizeSearch(
        `${i.name} ${i.category} ${i.origin} ${i.location}`,
      ).includes(normalizeSearch(query)) &&
      (!location ||
        (location === "__missing" ? !i.location : i.location === location)) &&
      (!condition ||
        (condition === "__pending"
          ? effectiveQuantity(i) === null || !i.location || !i.origin
          : transferStatus(i) === condition)) &&
      (!section || i.category === section),
  );
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
  function selectItem(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function resetSelected() {
    if (actor !== sender || !selected.size) return;
    const next: Item[] = [];
    for (const item of items) {
      if (!selected.has(item.id)) {
        next.push(item);
        continue;
      }
      const original = initialInventory.find((i) => i.id === item.id);
      if (original) next.push(structuredClone(original));
    }
    if (persist(next)) {
      setSelected(new Set());
      setResetOpen(false);
      setMessage(
        "Datos de los registros seleccionados borrados. Se conserva el inventario original del Excel.",
      );
    }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || imageBusy) return;
    if (items.some((i) => i.id === draft.id)) {
      setError(
        "Los registros existentes se actualizan desde la tabla principal.",
      );
      return;
    }
    if (
      !draft.name.trim() ||
      !validCount(draft.quantity) ||
      !destinations.includes(draft.location)
    ) {
      setError("Completa nombre, destino y una cantidad entera válida.");
      return;
    }
    if (
      persist([
        ...items,
        {
          ...draft,
          name: draft.name.trim(),
          sent: null,
          received: null,
          recycled: null,
        },
      ])
    ) {
      setDraft(null);
      setMessage("Registro añadido.");
    }
  }
  function update(item: Item, field: Editable, value: string | number | null) {
    if (!canEdit(field, item, actor)) {
      setError("Selecciona el hotel responsable de este campo.");
      return false;
    }
    if (
      field === "location" &&
      (typeof value !== "string" ||
        (value !== "" && !destinations.includes(value)) ||
        item.received !== null)
    ) {
      setError(
        "Elige un destino permitido. Para cambiar un destino recibido, retira primero su recepción.",
      );
      return false;
    }
    if (
      !["location", "damageSentMode", "damageReceivedMode"].includes(field) &&
      !validCount(value)
    ) {
      setError("Las cantidades deben ser enteros mayores o iguales a cero.");
      return false;
    }
    const next = { ...item, [field]: value };
    if (field === "sent") next.sentBy = value === null ? null : sender;
    if (field === "received") next.receivedBy = value === null ? null : actor;
    if (field === "damageSentMode")
      next.damageSent = value === "none" ? 0 : null;
    if (field === "damageReceivedMode")
      next.damageReceived = value === "none" ? 0 : null;
    if (field === "damageSent")
      next.damageSentMode = value === 0 ? "none" : "damaged";
    if (field === "damageReceived")
      next.damageReceivedMode = value === 0 ? "none" : "damaged";
    if (persist(items.map((i) => (i.id === item.id ? next : i)))) {
      setMessage("Cambios guardados en este navegador.");
      return true;
    }
    return false;
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
        "Inventariadas originales",
        "Inventario corregido",
        "Enviadas",
        "Rotura envío",
        "Recibidas",
        "Rotura recepción",
        "Rotura anterior sin responsable",
        "Comprobado envío por",
        "Comprobado recepción por",
        "Estado",
        "Comentario",
        "Imagen",
      ],
      ...visible.map((i) => [
        i.name,
        i.origin,
        i.location,
        i.category,
        i.quantity,
        i.correctedQuantity ?? null,
        i.sent,
        i.damageSent ?? null,
        i.received,
        i.damageReceived ?? null,
        i.recycled,
        i.sentBy ?? "",
        i.receivedBy ?? "",
        transferStatus(i),
        i.notes,
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
  ][] = [["quantity", "Unidades"]];
  return (
    <>
      <header>
        <a className="brand" href="./">
          <span className="seal">S</span>
          <span>
            SHERATON<small>FUERTEVENTURA</small>
          </span>
        </a>
        <span className="workspace">Distribución entre hoteles</span>
      </header>
      <main>
        <div className="eyebrow">SHERATON FUERTEVENTURA · OPERACIONES</div>
        <div className="heading">
          <div>
            <h1>Inventario y distribución</h1>
          </div>
          <button
            disabled={loadError || actor !== sender}
            onClick={() => {
              setError("");
              setImageBusy(false);
              setDraft(empty());
            }}
          >
            ＋ Añadir mobiliario
          </button>
        </div>

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
        <section className="inventory">
          <div className="section-title">
            <h2>
              Mobiliario <span>{items.length} registros</span>
            </h2>
            <div className="toolbar">
              <button
                disabled={loadError || !items.length}
                onClick={() => setPdfOpen(true)}
              >
                Exportar PDF
              </button>
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
          <div className="responsible">
            <label>
              Responsable de esta revisión
              <select
                aria-label="Hotel que registra"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
              >
                {[sender, ...destinations].map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <p>
              Los números se guardan al salir del campo o pulsar Intro. El hotel
              de origen registra envío; cada destino registra su recepción.
            </p>
          </div>
          <div className="selection-bar">
            <label>
              <input
                type="checkbox"
                aria-label="Seleccionar todo el mobiliario"
                checked={items.length > 0 && selected.size === items.length}
                ref={(node) => {
                  if (node)
                    node.indeterminate =
                      selected.size > 0 && selected.size < items.length;
                }}
                disabled={loadError || !items.length}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? new Set(items.map((i) => i.id))
                      : new Set(),
                  )
                }
              />
              Seleccionar todo el mobiliario
            </label>
            <span role="status">
              {selected.size} de {items.length} seleccionados
              {selected.size > visible.filter((i) => selected.has(i.id)).length
                ? " · incluye registros fuera del filtro"
                : ""}
            </span>
            <button
              className="secondary"
              disabled={!selected.size}
              onClick={() => setSelected(new Set())}
            >
              Quitar selección
            </button>
            <button
              className="danger-button"
              disabled={loadError || !selected.size || actor !== sender}
              onClick={() => {
                setError("");
                setResetOpen(true);
              }}
            >
              Borrar datos seleccionados
            </button>
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
              {["Pendiente", "Enviado", "Recibido"].map((c) => (
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
              <table className="editable-table">
                <colgroup>
                  {[22, 8, 17, 7, 6, 6, 10, 6, 10, 8].map((width, index) => (
                    <col key={index} style={{ width: width + "%" }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="block-headings">
                    <th colSpan={4} className="block-base">
                      Información original
                    </th>
                    <th colSpan={3} className="block-sender block-start">
                      Hotel origen · Sheraton
                    </th>
                    <th colSpan={2} className="block-receiver block-start">
                      Hotel destino
                    </th>
                    <th className="block-status block-start">Común</th>
                  </tr>
                  <tr>
                    <th className="block-base">Mobiliario</th>
                    <th className="block-base">Origen</th>
                    <th className="block-base">Destino</th>
                    <th className="block-base">
                      Inventario
                      <br />
                      original
                    </th>
                    <th className="block-sender block-start">
                      Inventario
                      <br />
                      corregido
                    </th>
                    <th className="block-sender">
                      Enviadas
                      <br />
                      <small>Hotel Sheraton</small>
                    </th>
                    <th className="block-sender">
                      Rotura envío
                      <br />
                      <small>Hotel Sheraton</small>
                    </th>
                    <th className="block-receiver block-start">
                      Recibidas
                      <br />
                      <small>Hotel destino</small>
                    </th>
                    <th className="block-receiver">
                      Rotura recepción
                      <br />
                      <small>Hotel destino</small>
                    </th>
                    <th className="block-status block-start">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((i) => (
                    <tr
                      key={i.id}
                      data-record-id={i.id}
                      className={selected.has(i.id) ? "selected-item" : ""}
                    >
                      <td data-label="Mobiliario" className="block-base">
                        <div className="item-cell">
                          <input
                            className="item-selection"
                            type="checkbox"
                            aria-label={"Seleccionar " + i.name}
                            checked={selected.has(i.id)}
                            disabled={loadError}
                            onChange={() => selectItem(i.id)}
                          />
                          <Photo item={i} onOpen={() => setDetail(i)} />
                          <div>
                            <strong>{i.name}</strong>
                            <small>{i.category}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Origen" className="block-base">
                        {i.origin || "Origen pendiente"}
                      </td>
                      <td data-label="Destino" className="block-base">
                        <Destination
                          item={i}
                          disabled={loadError || actor !== sender}
                          change={(f, v) => update(i, f, v)}
                        />
                      </td>
                      <td
                        data-label="Inventariadas originales"
                        className="block-base"
                      >
                        <strong>{displayCount(i.quantity)}</strong>
                      </td>
                      <td
                        data-label="Inventario corregido"
                        className="block-sender block-start"
                      >
                        <Count
                          value={i.correctedQuantity ?? null}
                          label="Inventario corregido"
                          disabled={loadError || actor !== sender}
                          onSave={(v) => update(i, "correctedQuantity", v)}
                        />
                      </td>
                      <td
                        data-label="Enviadas · Sheraton"
                        className="block-sender"
                      >
                        <Count
                          value={i.sent}
                          label="Enviadas"
                          disabled={loadError || actor !== sender}
                          onSave={(v) => update(i, "sent", v)}
                        />
                        {i.sent !== null && (
                          <small>
                            {i.sentBy
                              ? "Comprobado por " + i.sentBy
                              : "Registro anterior · responsable sin identificar"}
                          </small>
                        )}
                      </td>
                      <td data-label="Rotura envío" className="block-sender">
                        <Damage
                          item={i}
                          side="Sent"
                          disabled={loadError || actor !== sender}
                          change={(f, v) => update(i, f, v)}
                        />
                        {i.recycled !== null && (
                          <small>
                            Rotura anterior sin responsable: {i.recycled}
                          </small>
                        )}
                      </td>
                      <td
                        data-label="Recibidas · destino"
                        className="block-receiver block-start"
                      >
                        <Count
                          value={i.received}
                          label="Recibidas"
                          disabled={loadError || !canEdit("received", i, actor)}
                          onSave={(v) => update(i, "received", v)}
                        />
                        <small>
                          {i.receivedBy
                            ? "Comprobado por " + i.receivedBy
                            : "A completar por " +
                              (i.location || "hotel destino")}
                        </small>
                      </td>
                      <td
                        data-label="Rotura recepción"
                        className="block-receiver"
                      >
                        <Damage
                          item={i}
                          side="Received"
                          disabled={
                            loadError || !canEdit("damageReceived", i, actor)
                          }
                          change={(f, v) => update(i, f, v)}
                        />
                      </td>
                      <td
                        data-label="Estado"
                        className="block-status block-start"
                      >
                        <span
                          className={
                            "badge transfer-" + transferStatus(i).toLowerCase()
                          }
                        >
                          {transferStatus(i)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="gallery">
              {visible.map((i) => (
                <article
                  key={i.id}
                  data-record-id={i.id}
                  className={selected.has(i.id) ? "selected-item" : ""}
                >
                  <label className="gallery-selection">
                    <input
                      type="checkbox"
                      aria-label={"Seleccionar " + i.name}
                      checked={selected.has(i.id)}
                      disabled={loadError}
                      onChange={() => selectItem(i.id)}
                    />
                    Seleccionar
                  </label>
                  <Photo item={i} onOpen={() => setDetail(i)} />
                  <div className="card-content">
                    <small>{i.category}</small>
                    <h3>{i.name}</h3>
                    <p>
                      {i.origin || "Origen pendiente"} →{" "}
                      {i.location || "Sin destino"}
                    </p>
                    <p>
                      <strong>{displayCount(i.quantity)}</strong> inventariadas
                      originales
                      {i.correctedQuantity != null && (
                        <>
                          <br />
                          Inventario corregido:{" "}
                          <strong>{displayCount(i.correctedQuantity)}</strong>
                        </>
                      )}
                    </p>
                    <button className="link" onClick={() => setDetail(i)}>
                      Ver detalle
                    </button>
                    <button
                      className="link"
                      onClick={() => {
                        setView("table");
                        setQuery(i.name);
                      }}
                    >
                      Ver en tabla
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
            <span>Inventario y seguimiento por hotel</span>
          </footer>
        </section>
      </main>
      {resetOpen && (
        <dialog
          ref={(node) => {
            if (node && !node.open) node.showModal();
          }}
          onCancel={() => setResetOpen(false)}
          aria-labelledby="reset-title"
          aria-describedby="reset-description"
        >
          <h2 id="reset-title">
            Estás a punto de borrar todos los datos, ¿estás seguro?
          </h2>
          <p id="reset-description">
            Esta acción afecta a {selected.size} registros seleccionados,
            incluidos los que no se ven por los filtros. Se borrarán las
            correcciones, envíos, recepciones, roturas y comentarios añadidos;
            los destinos del Excel se restablecerán. El mobiliario, las
            fotografías y el inventario original del Excel se conservan. Los
            muebles nuevos seleccionados se eliminarán junto con sus fotos.
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button
              autoFocus
              className="secondary"
              onClick={() => setResetOpen(false)}
            >
              No
            </button>
            <button className="danger-button" onClick={resetSelected}>
              Sí
            </button>
          </div>
        </dialog>
      )}
      {pdfOpen && <PdfExport items={items} onClose={() => setPdfOpen(false)} />}
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
            <ImagePicker
              key={draft.id}
              value={draft.image}
              items={items}
              onBusy={setImageBusy}
              onChange={(image) =>
                setDraft((current) =>
                  current?.id === draft.id ? { ...current, image } : current,
                )
              }
            />
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
                <select
                  value={draft.location}
                  required
                  onChange={(e) =>
                    setDraft({ ...draft, location: e.target.value })
                  }
                >
                  <option value="">Selecciona destino</option>
                  {destinations.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
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
              Notas
              <textarea
                maxLength={2000}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </label>

            {error && <p role="alert">{error}</p>}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setDraft(null)}
              >
                Cancelar
              </button>
              <button disabled={imageBusy}>Guardar mobiliario</button>
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
            {displayCount(detail.quantity)} unidades inventariadas originales ·{" "}
            {transferStatus(detail)}
          </p>
          {detail.correctedQuantity != null && (
            <p>
              Inventario corregido: {displayCount(detail.correctedQuantity)}
            </p>
          )}
          <p>{detail.notes}</p>
        </dialog>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
