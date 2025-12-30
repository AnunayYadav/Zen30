import { Workout } from '../types';

export const WORKOUT_DB: Workout[] = [
  { 
    id: 'w1', 
    title: 'Chest Destruction', 
    duration: '45 min', 
    estCalories: 350, 
    category: 'Chest', 
    difficulty: 'Advanced',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80' 
  },
  { 
    id: 'w2', 
    title: 'Leg Day from Hell', 
    duration: '60 min', 
    estCalories: 500, 
    category: 'Legs', 
    difficulty: 'Advanced',
    image: 'https://images.unsplash.com/photo-1434608519344-49d77a699ded?w=800&q=80' 
  },
  { 
    id: 'w3', 
    title: 'HIIT Cardio', 
    duration: '20 min', 
    estCalories: 280, 
    category: 'Cardio', 
    difficulty: 'Intermediate',
    image: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800&q=80' 
  },
  { 
    id: 'w4', 
    title: 'Deep Stretch', 
    duration: '15 min', 
    estCalories: 50, 
    category: 'Stretch', 
    difficulty: 'Beginner',
    image: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&q=80' 
  },
  {
    id: 'w5',
    title: 'Abs & Core',
    duration: '15 min',
    estCalories: 150,
    category: 'Cardio',
    difficulty: 'Intermediate',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80'
  },
  {
    id: 'w6',
    title: 'Full Body Power',
    duration: '40 min',
    estCalories: 400,
    category: 'Legs',
    difficulty: 'Advanced',
    image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80'
  }
];
