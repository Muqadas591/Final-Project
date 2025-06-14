import { db } from './init'; // Use compat initialized db

const testFirestore = async () => {
  try {
    console.log('Firestore db:', !!db);
    if (!db) throw new Error('Firestore db is undefined');
    await db.collection('test').add({
      test: 'Hello, Firestore!',
      timestamp: new Date().toISOString(),
    });
    console.log('Document written successfully');
  } catch (error) {
    console.error('Error writing to Firestore:', error.message, error.stack);
  }
};

testFirestore();
