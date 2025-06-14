import { db } from './init';
import "firebase/compat/firestore"; // Ensure compat firestore is imported

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
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId');
    }
    if (!questionId || typeof questionId !== 'string') {
      throw new Error('Invalid questionId');
    }
    if (response === undefined || response === null) {
      throw new Error('Invalid response value');
    }

    // Create document ID combining userId and questionId to prevent duplicates
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
      error: error.message,
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
      console.log(`[Firestore] Document ID: ${doc.id}, Data:`, doc.data());
      try {
        const data = doc.data();
        console.log(`[Firestore] Processing question ${doc.id}:`, data);

        // Validate required fields with more detailed logging
        if (!data.text || typeof data.text !== 'string') {
          console.warn(`Question ${doc.id} missing text:`, data);
          throw new Error('Missing or invalid "text" field');
        }
        
        // Infer type from structure if not explicitly set
        if (!data.type) {
          if (Array.isArray(data.options) && data.options.length > 0) {
            data.type = 'options';
          } else if (data.minValue !== undefined || data.maxValue !== undefined) {
            data.type = 'scale';
          }
        }
        
        if (!data.type || !['scale', 'options'].includes(data.type)) {
          console.warn(`Question ${doc.id} has invalid type "${data.type}":`, data);
          throw new Error('Missing or invalid "type" field');
        }

        // Build question object
        const question = {
          id: doc.id,
          text: data.text.trim(),
          type: data.type
        };

        // Handle multiple-choice questions
        if (data.type === 'options') {
          if (!Array.isArray(data.options) || data.options.length === 0) {
            console.warn(`Question ${doc.id} missing options array:`, data);
            throw new Error('Missing or empty options array');
          }
          
          // THIS IS THE FIXED PART - Handle both string arrays and object arrays
          question.options = data.options.map((opt, i) => {
            // If option is already an object
            if (typeof opt === 'object' && opt !== null) {
              return {
                text: opt.text ? opt.text.trim() : `Option ${i+1}`,
                value: opt.value !== undefined ? opt.value : i
              };
            } 
            // If option is a string (your case)
            else if (typeof opt === 'string') {
              return {
                text: opt.trim(),
                value: opt
              };
            }
            // Fallback
            else {
              return {
                text: `Option ${i+1}`,
                value: i
              };
            }
          });
          
          // Log the processed options for debugging
          console.log(`[Firestore] Processed options for question ${doc.id}:`, question.options);
        }

        // Handle scale questions
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