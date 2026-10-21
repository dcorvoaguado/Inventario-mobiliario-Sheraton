import { useState, useEffect, type FormEvent } from "react";
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
  hotels,
  sender,
  transferStatus,
  effectiveQuantity,
  normalizeSearch,
  type Item,
} from "./inventory";
import { canEdit, type Editable } from "./InlineFields";
import ImagePicker from "./ImagePicker";
import DestinationPicker from "./DestinationPicker";
import InventoryTable from "./InventoryTable";
import {
  allocation,
  allocationError,
  hasMovement,
  productKey,
  productRows,
  replaceDestinations,
  resetAllocationSelection,
  syncRemainders,
} from "./allocation";
import PdfExport from "./PdfExport";
import { deletedKey, readDeleted } from "./deleted";
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
      readDeleted();
      return false;
    } catch {
      return true;
    }
  });
  const [items, setItems] = useState<Item[]>(() => {
    try {
      return syncRemainders(read());
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<Item | null>(null);
  const [destinationItem, setDestinationItem] = useState<Item | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverySelection, setRecoverySelection] = useState<Set<string>>(
    new Set(),
  );
  const [archive, setArchive] = useState<Item[]>(() => {
    try {
      return readDeleted();
    } catch {
      return [];
    }
  });
  const deleted = archive.filter(
    (row) => !items.some((active) => active.id === row.id),
  );
  const [actor, setActor] = useState(sender);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  const [view, setView] = useState<"table" | "gallery">("table");
  const selectable = items.filter((row) => !row.isRemainder);
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
      next = syncRemainders(next);
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
    const next = resetAllocationSelection(
      items.filter((row) => !row.isRemainder),
      selected,
    ).filter((row) => !deleted.some((removed) => removed.id === row.id));
    if (persist(next)) {
      setSelected(new Set());
      setResetOpen(false);
      setMessage(
        "Datos de los registros seleccionados borrados. Se conserva el inventario original del Excel.",
      );
    }
  }
  function deleteFurniture() {
    if (loadError || actor !== sender || !selected.size) return;
    const removed = items.filter((row) => selected.has(row.id));
    const nextArchive = [
      ...archive.filter((row) => !selected.has(row.id)),
      ...removed,
    ];
    try {
      // Archive first: a failed second write never destroys the only copy.
      localStorage.setItem(deletedKey, JSON.stringify(nextArchive));
      setArchive(nextArchive);
      if (!persist(items.filter((row) => !selected.has(row.id)))) return;
      setSelected(new Set());
      setDeleteOpen(false);
      setMessage(
        `${removed.length} elementos eliminados. Puedes recuperarlos con «Recuperar mobiliario eliminado».`,
      );
    } catch {
      setError(
        "No se pudo guardar la copia de recuperación. No se ha eliminado ningún mobiliario.",
      );
    }
  }
  function recoverFurniture() {
    if (loadError || actor !== sender || !deleted.length) return;
    const chosen = deleted.filter((row) => recoverySelection.has(row.id));
    if (!chosen.length) return;
    const next = [...items, ...structuredClone(chosen)];
    // Restore the saved rows exactly; never overwrite current movements or
    // silently reinstate a distribution exceeding its shared stock.
    for (const row of chosen) {
      const problem = allocationError(next, row);
      if (problem) {
        setError(
          `No se puede recuperar «${row.name}»: ${problem} Ajusta los datos activos antes de recuperar. La copia eliminada se conserva.`,
        );
        return;
      }
    }
    if (!persist(next)) return;
    // Keep archived snapshots for crash safety. Active ids are excluded from
    // the recovery list; subsequent deletion replaces their snapshots.
    setRecoverOpen(false);
    setMessage(
      `${chosen.length} elementos recuperados con sus fotografías y datos guardados.`,
    );
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
      !hotels.includes(draft.origin) ||
      !hotels.includes(draft.location)
    ) {
      setError(
        "Completa nombre, hotel origen, hotel destino y una cantidad entera válida.",
      );
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
    setFieldErrors((current) => ({ ...current, [`${item.id}:${field}`]: "" }));
    if (!canEdit(field, item, actor)) {
      setError("Selecciona el hotel responsable de este campo.");
      return false;
    }
    if (
      field === "location" &&
      (typeof value !== "string" ||
        (value !== "" && !destinations.includes(value)) ||
        hasMovement(item))
    ) {
      setError(
        "Elige un destino permitido. No se puede cambiar una fila con movimientos registrados; puedes añadir otros hoteles con el selector múltiple.",
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
    if (item.isRemainder && field === "location") {
      next.id = crypto.randomUUID();
      next.isRemainder = false;
    }
    if (field === "allocatedQuantity" && !item.location) {
      setError("Selecciona un hotel antes de asignarle cantidades.");
      return false;
    }
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
    const group = productRows(items, item);
    if (
      field === "location" &&
      value !== "" &&
      group.some((i) => i.id !== item.id && i.location === value)
    ) {
      setError(
        "Este hotel ya tiene una fila para el mismo mueble. Usa la selección de varios hoteles.",
      );
      return false;
    }
    const proposed =
      field === "correctedQuantity"
        ? items.map((i) =>
            productKey(i) === productKey(item)
              ? { ...i, correctedQuantity: value as number | null }
              : i,
          )
        : items.map((i) => (i.id === item.id ? next : i));
    if (
      ["allocatedQuantity", "correctedQuantity", "sent", "received"].includes(
        field,
      )
    ) {
      const issue = allocationError(proposed, next);
      if (issue) {
        setFieldErrors((current) => ({
          ...current,
          [`${item.id}:${field}`]: issue,
        }));
        return false;
      }
    }
    if (persist(proposed)) {
      setError("");
      return true;
    }

    return false;
  }
  function manageDestinations(
    item: Item,
    hotels: string[],
    quantities: Record<string, number | null>,
  ) {
    if (actor !== sender)
      return "Solo Hotel Sheraton puede organizar los destinos.";
    try {
      // Apply quantities and destinations as one transaction, including valid
      // transfers between hotels which would temporarily exceed stock otherwise.
      const working = items.map((row) =>
        productKey(row) === productKey(item) && hotels.includes(row.location)
          ? { ...row, allocatedQuantity: quantities[row.location] ?? null }
          : row,
      );
      const next = replaceDestinations(working, item, hotels).map((row) =>
        productKey(row) === productKey(item)
          ? { ...row, allocatedQuantity: quantities[row.location] ?? null }
          : row,
      );
      const problem = allocationError(next, item);
      if (problem) return problem;
      if (!persist(next))
        return "No se han podido guardar los destinos. Comprueba el almacenamiento del navegador.";
      setSelected(
        (current) =>
          new Set([...current].filter((id) => next.some((i) => i.id === id))),
      );
      setDestinationItem(null);
      setMessage(
        "Destinos actualizados. Cada fila comparte el mismo inventario del producto.",
      );
      return null;
    } catch (e) {
      return e instanceof Error
        ? e.message
        : "No se pudieron actualizar los destinos.";
    }
  }
  function covered(original: Item) {
    return (
      deleted.some((i) => i.id === original.id) ||
      items.some(
        (i) => i.id === original.id || productKey(i) === productKey(original),
      )
    );
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
        "Unidades asignadas",
        "Total real disponible",
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
        i.allocatedQuantity ?? null,
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
    const added = initialInventory.filter((i) => !covered(i));
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
        <a
          className="brand"
          href="./"
          aria-label="Sheraton · Inicio del inventario"
        >
          <img
            className="brand-logo"
            src={`${import.meta.env.BASE_URL}images/brand/sheraton-reference.png`}
            alt="Sheraton · Est. 1937"
            width="191"
            height="82"
          />
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
              Mobiliario{" "}
              <span>
                {new Set(items.map(productKey)).size}{" "}
                {new Set(items.map(productKey)).size === 1
                  ? "mueble"
                  : "muebles"}{" "}
                · {items.length} filas de reparto
              </span>
            </h2>
            <div className="toolbar">
              <button
                disabled={loadError || !items.length}
                onClick={() => setPdfOpen(true)}
              >
                Exportar PDF
              </button>
              <details className="more-options">
                <summary>Más opciones</summary>
                <div className="more-options-menu">
                  <button
                    className="secondary"
                    onClick={loadExcel}
                    disabled={loadError || initialInventory.every(covered)}
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
                    Descargar copia de seguridad
                  </button>
                  <button
                    className="secondary"
                    onClick={csv}
                    disabled={!visible.length}
                  >
                    Exportar CSV
                  </button>
                </div>
              </details>
            </div>
          </div>
          <div className="responsible">
            <label>
              Hotel que registra
              <select
                aria-label="Hotel que registra"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
              >
                {hotels.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <p>
              {actor === sender
                ? "Puedes repartir el mobiliario y registrar los envíos. Cada hotel destino completa su recepción."
                : `Estás registrando la recepción de ${actor}. Sheraton organiza el reparto y los envíos.`}
            </p>
          </div>
          <div className="selection-bar">
            <label>
              <input
                type="checkbox"
                aria-label="Seleccionar todo el mobiliario"
                checked={
                  items.length > 0 && selected.size === selectable.length
                }
                ref={(node) => {
                  if (node)
                    node.indeterminate =
                      selected.size > 0 && selected.size < selectable.length;
                }}
                disabled={loadError || !items.length}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? new Set(selectable.map((i) => i.id))
                      : new Set(),
                  )
                }
              />
              Seleccionar todo el mobiliario
            </label>
            <span role="status">
              {selected.size} de {selectable.length} seleccionados
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
              className="secondary"
              disabled={loadError || !selected.size || actor !== sender}
              onClick={() => {
                setError("");
                setResetOpen(true);
              }}
            >
              Restablecer datos
            </button>
            <button
              className="danger-button"
              disabled={loadError || !selected.size || actor !== sender}
              onClick={() => {
                setError("");
                setDeleteOpen(true);
              }}
            >
              Eliminar mobiliario
            </button>
            <button
              className="secondary"
              disabled={loadError || !deleted.length || actor !== sender}
              onClick={() => {
                setError("");
                setRecoverySelection(new Set());
                setRecoverOpen(true);
              }}
            >
              Recuperar mobiliario eliminado ({deleted.length})
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
            <InventoryTable
              items={items}
              visible={visible}
              actor={actor}
              loadError={loadError}
              selected={selected}
              onSelect={selectItem}
              onChange={update}
              onManage={setDestinationItem}
              onPhoto={setDetail}
              errors={fieldErrors}
            />
          ) : (
            <div className="gallery">
              {visible
                .filter(
                  (i, index, rows) =>
                    rows.findIndex(
                      (row) => productKey(row) === productKey(i),
                    ) === index,
                )
                .map((i) => (
                  <article
                    key={i.id}
                    data-record-id={i.id}
                    data-product-id={productKey(i)}
                    className={selected.has(i.id) ? "selected-item" : ""}
                  >
                    <label className="gallery-selection">
                      <input
                        type="checkbox"
                        aria-label={"Seleccionar " + i.name}
                        checked={productRows(items, i)
                          .filter((row) => !row.isRemainder)
                          .every((row) => selected.has(row.id))}
                        disabled={loadError}
                        onChange={(e) =>
                          setSelected((current) => {
                            const next = new Set(current);
                            for (const row of productRows(items, i).filter(
                              (row) => !row.isRemainder,
                            )) {
                              if (e.target.checked) next.add(row.id);
                              else next.delete(row.id);
                            }
                            return next;
                          })
                        }
                      />
                      Seleccionar
                    </label>
                    <Photo item={i} onOpen={() => setDetail(i)} />
                    <div className="card-content">
                      <small>{i.category}</small>
                      <h3>{i.name}</h3>
                      <p>
                        {i.origin || "Origen pendiente"} →{" "}
                        {[
                          ...new Set(
                            productRows(items, i).map(
                              (row) => row.location || "Sin hotel asignado",
                            ),
                          ),
                        ].join(", ")}
                      </p>
                      <p>
                        <strong>{displayCount(i.quantity)}</strong>{" "}
                        inventariadas originales
                        <br />
                        Total real disponible:{" "}
                        <strong>
                          {displayCount(allocation(items, i).limit)}
                        </strong>
                      </p>
                      <button
                        disabled={loadError || actor !== sender}
                        onClick={() => setDestinationItem(i)}
                      >
                        Repartir entre hoteles
                      </button>
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
      {destinationItem && (
        <DestinationPicker
          item={destinationItem}
          items={items}
          onClose={() => setDestinationItem(null)}
          onApply={(hotels, quantities) =>
            manageDestinations(destinationItem, hotels, quantities)
          }
        />
      )}
      {(deleteOpen || recoverOpen) && (
        <dialog
          ref={(node) => {
            if (node && !node.open) node.showModal();
          }}
          onCancel={() => {
            setDeleteOpen(false);
            setRecoverOpen(false);
          }}
          aria-labelledby="furniture-action-title"
        >
          <h2 id="furniture-action-title">
            {deleteOpen
              ? "¿Eliminar el mobiliario seleccionado?"
              : "Seleccionar mobiliario para recuperar"}
          </h2>
          <p>
            {deleteOpen
              ? `Vas a eliminar ${selected.size} filas de mobiliario, incluidas las seleccionadas fuera del filtro. Esta acción puede afectar al inventario y al reparto entre hoteles. Las filas desaparecerán de la tabla y de las exportaciones. Se guardará una copia con sus fotografías y datos para recuperarlas posteriormente en este navegador.`
              : `Selecciona las filas que quieres recuperar con sus fotografías, destinos y cantidades guardadas. Se comprobarán los límites del inventario antes de restaurarlas. Los elementos activos se conservarán. La copia de recuperación está guardada en este navegador; no borres sus datos si quieres conservarla.`}
          </p>
          {recoverOpen && (
            <div className="recovery-list">
              <label>
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos los eliminados"
                  checked={
                    deleted.length > 0 &&
                    recoverySelection.size === deleted.length
                  }
                  onChange={(e) =>
                    setRecoverySelection(
                      e.target.checked
                        ? new Set(deleted.map((row) => row.id))
                        : new Set(),
                    )
                  }
                />
                Seleccionar todos los eliminados
              </label>
              {deleted.map((row) => (
                <label key={row.id}>
                  <input
                    type="checkbox"
                    aria-label={`Recuperar ${row.name} · ${row.location || "Sin hotel asignado"}`}
                    checked={recoverySelection.has(row.id)}
                    onChange={(e) =>
                      setRecoverySelection((current) => {
                        const next = new Set(current);
                        if (e.target.checked) next.add(row.id);
                        else next.delete(row.id);
                        return next;
                      })
                    }
                  />
                  {row.image && <img src={imageUrl(row.image)} alt="" />}
                  <span>
                    {row.name}
                    <small>
                      {row.location || "Sin hotel asignado"} · Inventario:{" "}
                      {displayCount(row.quantity)} · Asignadas:{" "}
                      {displayCount(row.allocatedQuantity ?? null)}
                    </small>
                  </span>
                </label>
              ))}
              <p>
                {recoverySelection.size} seleccionados de {deleted.length}
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button
              autoFocus
              className="secondary"
              onClick={() => {
                setDeleteOpen(false);
                setRecoverOpen(false);
              }}
            >
              No
            </button>
            <button
              className={deleteOpen ? "danger-button" : ""}
              disabled={recoverOpen && !recoverySelection.size}
              onClick={deleteOpen ? deleteFurniture : recoverFurniture}
            >
              {deleteOpen
                ? "Sí, eliminar mobiliario"
                : "Recuperar seleccionados"}
            </button>
          </div>
        </dialog>
      )}
      {resetOpen && (
        <dialog
          ref={(node) => {
            if (node && !node.open) node.showModal();
          }}
          onCancel={() => setResetOpen(false)}
          aria-labelledby="reset-title"
          aria-describedby="reset-description"
        >
          <h2 id="reset-title">¿Restablecer los datos seleccionados?</h2>
          <p id="reset-description">
            Esta acción afecta a {selected.size} registros seleccionados,
            incluidos los que no se ven por los filtros. Se borrarán las
            correcciones, envíos, recepciones, roturas y comentarios añadidos;
            si seleccionas todas las filas de un producto, se restablecerán sus
            destinos e inventario corregido. Si seleccionas solo algunas filas,
            se mantendrán el reparto y el inventario corregido compartidos. El
            mobiliario, las fotografías y el inventario original del Excel se
            conservan. Los muebles nuevos seleccionados se eliminarán junto con
            sus fotos.
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
                <select
                  value={draft.origin}
                  required
                  onChange={(e) =>
                    setDraft({ ...draft, origin: e.target.value })
                  }
                >
                  {hotels.map((hotel) => (
                    <option key={hotel} value={hotel}>
                      {hotel}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Hotel destino
                <select
                  value={draft.location}
                  required
                  onChange={(e) =>
                    setDraft({ ...draft, location: e.target.value })
                  }
                >
                  <option value="">Selecciona hotel destino</option>
                  {hotels.map((hotel) => (
                    <option key={hotel} value={hotel}>
                      {hotel}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
              Total real disponible: {displayCount(detail.correctedQuantity)}
            </p>
          )}
          <p>{detail.notes}</p>
        </dialog>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
