import { getQuestions } from './firebase/firestore';

const debugQuestionData = async () => {
  try {
    console.log('Starting question data debug...');
    const questions = await getQuestions();
    console.log('Raw questions data:', JSON.stringify(questions, null, 2));
    
    questions.forEach((q, i) => {
      console.log(`\nQuestion ${i}:`);
      console.log('ID:', q.id);
      console.log('Text:', q.text);
      console.log('Type:', q.type);
      
      if (q.type === 'options') {
        console.log('Options:', q.options);
        console.log('Options type:', typeof q.options);
        console.log('Is array:', Array.isArray(q.options));
        
        if (q.options) {
          q.options.forEach((opt, j) => {
            console.log(`  Option ${j}:`, opt);
            console.log(`  Option ${j} text:`, opt.text);
            console.log(`  Option ${j} value:`, opt.value);
          });
        }
      }
    });
    
    return questions;
  } catch (error) {
    console.error('Debug error:', error);
    throw error;
  }
};

// Run the debug function immediately
debugQuestionData().catch(console.error);

export default debugQuestionData;
