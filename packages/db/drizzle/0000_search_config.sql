-- Configuración de búsqueda de texto en español, sin acentos.
--
-- Va antes que cualquier tabla porque products.search_vector es una columna
-- generada que la usa, y una columna generada exige que su expresión sea
-- inmutable. Llamar a unaccent() directamente no lo es, pero una
-- configuración de búsqueda sí, porque queda fija en el catálogo.
--
-- El resultado es que "corazon" encuentra "Corazón" y "zarcillo dorado"
-- encuentra "Zarcillos / Dorada".

CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'spanish_unaccent') THEN
    CREATE TEXT SEARCH CONFIGURATION spanish_unaccent (COPY = spanish);

    ALTER TEXT SEARCH CONFIGURATION spanish_unaccent
      ALTER MAPPING FOR hword, hword_part, word
      WITH unaccent, spanish_stem;
  END IF;
END
$$;
