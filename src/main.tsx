import { useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
type Item = {
  id: string;
  name: string;
  location: string;
  category: string;
  quantity: number;
  condition: string;
  notes: string;
};
const key = "sheraton-inventory-v1";
const conditions = ["Buen estado", "Revisar", "Fuera de servicio"];
const empty = (): Item => ({
  id: crypto.randomUUID(),
  name: "",
  location: "",
  category: "Asientos",
  quantity: 1,
  condition: conditions[0],
  notes: "",
});
function read(): Item[] {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (
    !Array.isArray(data) ||
    !data.every(
      (i) =>
        i &&
        typeof i.id === "string" &&
        typeof i.name === "string" &&
        typeof i.location === "string" &&
        typeof i.category === "string" &&
        typeof i.notes === "string" &&
        Number.isSafeInteger(i.quantity) &&
        i.quantity > 0 &&
        conditions.includes(i.condition),
    )
  )
    throw Error("Invalid inventory");
  return data;
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
    [condition, setCondition] = useState("");
  const [draft, setDraft] = useState<Item | null>(null),
    [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const visible = items.filter(
    (i) =>
      `${i.name} ${i.category} ${i.location}`
        .toLocaleLowerCase("es")
        .includes(query.toLocaleLowerCase("es")) &&
      (!location || i.location === location) &&
      (!condition || i.condition === condition),
  );
  function persist(next: Item[]) {
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
    if (!draft || loadError) return;
    const next = {
      ...draft,
      name: draft.name.trim(),
      location: draft.location.trim(),
      notes: draft.notes.trim(),
    };
    if (
      !next.name ||
      !next.location ||
      !Number.isSafeInteger(next.quantity) ||
      next.quantity < 1
    ) {
      setError(
        "Introduce nombre, ubicación y una cantidad entera mayor que cero.",
      );
      return;
    }
    if (
      persist(
        items.some((i) => i.id === next.id)
          ? items.map((i) => (i.id === next.id ? next : i))
          : [...items, next],
      )
    )
      setDraft(null);
  }
  function csv() {
    const cell = (v: string | number) =>
      '"' +
      String(
        typeof v === "string" && /^[=+@\-\t\r\n]/.test(v) ? "'" + v : v,
      ).replaceAll('"', '""') +
      '"';
    const rows = [
      ["Nombre", "Ubicación", "Categoría", "Unidades", "Estado", "Notas"],
      ...visible.map((i) => [
        i.name,
        i.location,
        i.category,
        i.quantity,
        i.condition,
        i.notes,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((r) => r.map(cell).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventario-sheraton.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <header>
        <a className="brand" href="./">
          <span className="seal">S</span>
          <span>
            SHERATON<small>GESTIÓN DE MOBILIARIO</small>
          </span>
        </a>
        <span className="workspace">Inventario del hotel</span>
      </header>
      <main>
        <div className="eyebrow">OPERACIONES · INVENTARIO</div>
        <div className="heading">
          <div>
            <h1>Cada pieza, en su lugar.</h1>
            <p>Organiza y cuida el mobiliario de tus espacios.</p>
          </div>
          <button disabled={loadError} onClick={() => setDraft(empty())}>
            ＋ Añadir mobiliario
          </button>
        </div>
        <aside className="notice">
          Almacenamiento local · Los datos se guardan solo en este navegador.
          Exporta una copia antes de cambiar de dispositivo o borrar sus datos.
        </aside>
        {(loadError || error) && (
          <p role="alert" className="error">
            {loadError
              ? "No se puede leer el inventario guardado. No se sobrescribirán tus datos. Recupera una copia o revisa el almacenamiento del navegador."
              : error}
          </p>
        )}
        <section className="stats" aria-label="Resumen">
          <article>
            <span>UNIDADES TOTALES</span>
            <strong>{items.reduce((n, i) => n + i.quantity, 0)}</strong>
            <small>Mobiliario registrado</small>
          </article>
          <article>
            <span>UBICACIONES</span>
            <strong>{new Set(items.map((i) => i.location)).size}</strong>
            <small>Espacios con inventario</small>
          </article>
          <article>
            <span>REQUIEREN ATENCIÓN</span>
            <strong>
              {items
                .filter((i) => i.condition !== conditions[0])
                .reduce((n, i) => n + i.quantity, 0)}
            </strong>
            <small>Unidades para revisar o reparar</small>
          </article>
        </section>
        <section className="inventory">
          <div className="section-title">
            <h2>
              Mobiliario <span>{items.length} registros</span>
            </h2>
            <button
              className="secondary"
              onClick={csv}
              disabled={!visible.length}
            >
              ↓ Exportar CSV
            </button>
          </div>
          <div className="filters">
            <input
              aria-label="Buscar mobiliario"
              placeholder="Buscar por nombre, categoría o ubicación…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Filtrar ubicación"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">Todas las ubicaciones</option>
              {[...new Set(items.map((i) => i.location))].sort().map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <select
              aria-label="Filtrar estado"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {conditions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mobiliario</th>
                  <th>Ubicación</th>
                  <th>Unidades</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.name}</strong>
                      <small>{i.category}</small>
                    </td>
                    <td>{i.location}</td>
                    <td>{i.quantity}</td>
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
                        onClick={() => setDraft({ ...i })}
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
                  : "Añade el primer mueble para empezar a organizar tus espacios."}
              </p>
            </div>
          )}
          <footer>
            {visible.length} de {items.length} registros{" "}
            <span>Control del mobiliario · Sheraton</span>
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
            <label>
              Ubicación
              <input
                required
                maxLength={160}
                placeholder="Ej. Lobby · Planta baja"
                value={draft.location}
                onChange={(e) =>
                  setDraft({ ...draft, location: e.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label>
                Categoría
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                >
                  {[
                    "Asientos",
                    "Mesas",
                    "Almacenaje",
                    "Camas",
                    "Iluminación",
                    "Decoración",
                    "Otros",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Unidades
                <input
                  required
                  type="number"
                  min="1"
                  max="1000000"
                  step="1"
                  value={draft.quantity}
                  onChange={(e) =>
                    setDraft({ ...draft, quantity: Number(e.target.value) })
                  }
                />
              </label>
            </div>
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
            inventario.
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
