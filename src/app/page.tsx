import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={`container ${styles.page}`}>
      <main className={styles.main}>
        <h1>Fábrica — Consola</h1>
        <p>
          Elige un proyecto arriba o crea uno nuevo. Cada proyecto vive en su propio repo de
          GitHub (nacido de <code>rifc23/fabrica-agentes-template</code>) — esta consola solo lee
          y escribe ahí, sin base de datos propia.
        </p>
      </main>
    </div>
  );
}
