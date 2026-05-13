// import { loadEnv } from 'vite';
// import { Client, TablesDB, ID } from 'appwrite';

// const env = loadEnv('development', process.cwd());

// const client = new Client();
// client
//   .setEndpoint(env.VITE_APPWRITE_ENDPOINT)
//   .setProject(env.VITE_APPWRITE_PROJECT_ID);

// // We need an authenticated session to delete, or use an API key. We don't have an API key.
// // But we can check if the endpoint signature is correct.

// const databases = new TablesDB(client);

// async function run() {
//   try {
//     const res = await databases.deleteRow({
//       databaseId: env.VITE_APPWRITE_DATABASE_ID,
//       tableId: env.VITE_COLLECTION_LISTING,
//       rowId: 'dummy-id'
//     });
//     console.log('Success:', res);
//   } catch (err) {
//     console.error('Error deleting:', err);
//   }
// }
// run();
