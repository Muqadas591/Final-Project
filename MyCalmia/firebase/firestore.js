import { db } from './init';
import "firebase/compat/firestore";

export const saveFCMToken = async (userId, token) => {
  try {
    await db.collection('users').doc(userId).set({
      fcmToken: token,
      updatedAt: new Date()
    }, { merge: true });
    console.log('FCM token saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving FCM token:', error);
    throw error;
  }
};

export const saveUserResponse = async (userId, questionId, response) => {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId');
    }
    if (!questionId || typeof questionId !== 'string') {
      throw new Error('Invalid questionId');
    }
    if (response === undefined || response === null) {
      throw new Error('Invalid response value');
    }

    const docId = `${userId}_${questionId}`;

    await db.collection('assessment').doc(docId).set({
      userId,
      questionId,
      response,
      timestamp: new Date().toISOString(),
    }, { merge: true });

    console.log('User response saved successfully for', { userId, questionId });
    return true;
  } catch (error) {
    console.error('Error saving user response:', {
      message: error.message,
      stack: error.stack,
      userId,
      questionId,
      response
    });
    throw error;
  }
};

export const getUserData = async (userId) => {
  try {
    const docSnap = await db.collection('users').doc(userId).get();
    return docSnap.exists ? docSnap.data() : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

export const getQuestions = async () => {
  try {
    console.log('[Firestore] Fetching questions from collection "questionare"...');
    const querySnapshot = await db.collection('questionare').get();

    if (querySnapshot.empty) {
      console.warn('[Firestore] No questions found in collection');
      return [];
    }

    const questions = querySnapshot.docs.map(doc => {
      try {
        const data = doc.data();

        if (!data.text || typeof data.text !== 'string') {
          throw new Error('Missing or invalid "text" field');
        }

        if (!data.type) {
          if (Array.isArray(data.options) && data.options.length > 0) {
            data.type = 'options';
          } else if (data.minValue !== undefined || data.maxValue !== undefined) {
            data.type = 'scale';
          }
        }

        if (!data.type || !['scale', 'options'].includes(data.type)) {
          throw new Error('Missing or invalid "type" field');
        }

        const question = {
          id: doc.id,
          text: data.text.trim(),
          type: data.type
        };

        if (data.type === 'options') {
          if (!Array.isArray(data.options) || data.options.length === 0) {
            throw new Error('Missing or empty options array');
          }

          question.options = data.options.map((opt, i) => {
            if (typeof opt === 'object' && opt !== null) {
              return {
                text: opt.text ? opt.text.trim() : `Option ${i+1}`,
                value: opt.value !== undefined ? opt.value : i
              };
            } else if (typeof opt === 'string') {
              return {
                text: opt.trim(),
                value: opt
              };
            } else {
              return {
                text: `Option ${i+1}`,
                value: i
              };
            }
          });
        }

        if (data.type === 'scale') {
          question.minValue = typeof data.minValue === 'number' ? data.minValue : 1;
          question.maxValue = typeof data.maxValue === 'number' ? data.maxValue : 5;
          question.step = typeof data.step === 'number' ? data.step : 1;
        }

        return question;
      } catch (error) {
        console.warn(`[Firestore] Invalid question ${doc.id}:`, error.message);
        return null;
      }
    }).filter(Boolean);

    if (questions.length === 0) {
      throw new Error('No valid questions found in database');
    }

    console.log(`[Firestore] Successfully loaded ${questions.length} valid questions`);
    return questions;
  } catch (error) {
    console.error('Error getting questions:', error);
    throw error;
  }
};
