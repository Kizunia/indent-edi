// Integration tests must never touch a non-test database (DEC-023).
const url = process.env.DATABASE_URL_TEST;

if (!url) {
  throw new Error("DATABASE_URL_TEST is not set. Integration tests need the test database.");
}

const dbName = new URL(url).pathname.replace(/^\//, "");
if (!dbName.endsWith("_test")) {
  throw new Error(
    `Refusing to run: DATABASE_URL_TEST points at "${dbName}", which does not end in "_test".`
  );
}

// The app reads DATABASE_URL, so point it at the test database for these runs.
process.env.DATABASE_URL = url;
