import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('lapin_manager.db');
  }
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  const db = getDb();

  // Activer les clés étrangères
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Table races
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS races (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      description TEXT,
      poidsMoyenAdulte REAL,
      remarques TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // Table reproducteurs
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reproducteurs (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      nom TEXT,
      sexe TEXT NOT NULL,
      raceId TEXT NOT NULL,
      dateNaissance TEXT,
      origine TEXT NOT NULL,
      statut TEXT NOT NULL,
      emplacement TEXT,
      poids REAL,
      observation TEXT,
      prixAchat REAL,
      vendeur TEXT,
      dateAchat TEXT,
      donateur TEXT,
      dateReception TEXT,
      photo TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // Table saillies
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS saillies (
      id TEXT PRIMARY KEY,
      femelleId TEXT NOT NULL,
      maleIds TEXT NOT NULL, -- Stocké en tant que JSON string d'un tableau d'IDs
      dateSaillie TEXT NOT NULL,
      type TEXT NOT NULL,
      observation TEXT,
      statut TEXT NOT NULL,
      dateControle TEXT NOT NULL,
      datePreparation TEXT NOT NULL,
      dateMiseBasPrevue TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // Table portees
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS portees (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      femelleId TEXT NOT NULL,
      saillieId TEXT,
      dateMiseBas TEXT NOT NULL,
      totalNes INTEGER NOT NULL,
      vivantsNaissance INTEGER NOT NULL,
      mortsNes INTEGER NOT NULL,
      vivantsActuels INTEGER NOT NULL,
      emplacement TEXT,
      observation TEXT,
      dateSevragePrevue TEXT NOT NULL,
      dateSevrageReelle TEXT,
      statut TEXT NOT NULL,
      vivantsSevres INTEGER,
      destination TEXT,
      adoptionsIn INTEGER,
      adoptionsOut INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // Table mortalites
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS mortalites (
      id TEXT PRIMARY KEY,
      porteeId TEXT NOT NULL,
      date TEXT NOT NULL,
      quantite INTEGER NOT NULL,
      cause TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // Table alertes
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS alertes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      datePrevue TEXT NOT NULL,
      referenceId TEXT NOT NULL,
      titre TEXT NOT NULL,
      description TEXT,
      statut TEXT NOT NULL,
      notificationId TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // Table parametres
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS parametres (
      id TEXT PRIMARY KEY,
      joursAvantControle INTEGER NOT NULL,
      joursAvantPreparation INTEGER NOT NULL,
      dureeGestation INTEGER NOT NULL,
      ageSevrage INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // Table rappels
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS rappels (
      id TEXT PRIMARY KEY,
      titre TEXT NOT NULL,
      description TEXT,
      datePrevue TEXT NOT NULL,
      type TEXT NOT NULL,
      statut TEXT NOT NULL,
      notificationId TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // Table depenses
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS depenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      montant REAL NOT NULL,
      categorie TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // Table depensesRecurrentes
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS depensesRecurrentes (
      id TEXT PRIMARY KEY,
      titre TEXT NOT NULL,
      montant REAL NOT NULL,
      categorie TEXT NOT NULL,
      frequence TEXT NOT NULL,
      dateDebut TEXT NOT NULL,
      derniereGeneration TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // Table recettes
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recettes (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      montant REAL NOT NULL,
      categorie TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // Table traitements
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS traitements (
      id TEXT PRIMARY KEY,
      sujetType TEXT NOT NULL,
      sujetId TEXT,
      sujetNom TEXT,
      typeAction TEXT NOT NULL,
      nomProduit TEXT NOT NULL,
      objectif TEXT,
      datePrevue TEXT NOT NULL,
      dateRealisation TEXT,
      heure TEXT,
      dose TEXT,
      frequence TEXT,
      duree TEXT,
      prochainRappel TEXT,
      statut TEXT NOT NULL,
      resultatObserve TEXT,
      responsable TEXT,
      observation TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  // Initialisation des paramètres par défaut si nécessaire
  const checkSettings = await db.getAllAsync<{ count: number }>('SELECT count(*) as count FROM parametres');
  if (checkSettings.length === 0 || checkSettings[0].count === 0) {
    const nowStr = new Date().toISOString();
    await db.runAsync(`
      INSERT INTO parametres (id, joursAvantControle, joursAvantPreparation, dureeGestation, ageSevrage, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'default-settings',
      14,
      27,
      31,
      35,
      nowStr,
      nowStr,
      'pending'
    ]);
  }
}
