import { ChallengeTask } from '../types';

export const CHALLENGE_DB: ChallengeTask[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const isRest = day % 7 === 0;
  const isActiveRecovery = day % 4 === 0 && !isRest;
  
  if (isRest) {
    return {
      day,
      title: "Rest & Reset",
      description: "Full body rest. Hydrate and sleep well.",
      type: 'Rest',
      duration: '0 min'
    };
  }
  
  if (isActiveRecovery) {
    return {
      day,
      title: "Active Recovery",
      description: "Light stretching, yoga, or a 20min walk.",
      type: 'Active Recovery',
      duration: '20 min'
    };
  }

  const types = ['Upper Body Power', 'Lower Body Blast', 'HIIT Cardio', 'Core Crusher'];
  const typeIndex = i % types.length;
  
  return {
    day,
    title: types[typeIndex],
    description: "High intensity session. Push to failure.",
    type: 'Workout',
    duration: '45 min'
  };
});
