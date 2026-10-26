/** Nom canonique de la colonne « done » (archivage auto, sous-tâches). */
export const DONE_COLUMN_NAME = "Terminé";

/** Délai avant archivage auto des tâches « Terminé » (tâches + événementiel). */
export const AUTO_ARCHIVE_HOURS = 48;
export const AUTO_ARCHIVE_DELAY_MS = AUTO_ARCHIVE_HOURS * 60 * 60 * 1000;
