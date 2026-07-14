import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Fábrica — Consola</h1>
        <p>
          Esqueleto andante. El dropdown de proyectos y el dashboard llegan como features del
          backlog (docs/backlog.md). El endpoint <code>/api/proyectos</code> ya lee repos reales
          por topic <code>fabrica-agentes</code> vía la API de GitHub (server-side).
        </p>
      </main>
    </div>
  );
}
