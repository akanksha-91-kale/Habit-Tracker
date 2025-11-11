import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Check, X, Brain, TrendingUp, Sun, Clock, Moon, Zap } from 'lucide-react';

// --- Utility Functions ---
const getTodayDateKey = () => new Date().toISOString().split('T')[0];
const getLast7Days = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();
};
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { name: 'Morning', icon: Sun, color: 'text-yellow-600', urgency: 'Start strong!' };
  if (hour >= 12 && hour < 17) return { name: 'Afternoon', icon: Clock, color: 'text-orange-600', urgency: 'Time to focus!' };
  return { name: 'Evening', icon: Moon, color: 'text-indigo-600', urgency: 'Almost done for the day!' };
};

// --- LOCAL STORAGE FUNCTIONS ---

const STORAGE_KEY = 'habitTrackerData';

/**
 * Loads habits from localStorage.
 */
const loadHabits = () => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    return storedData ? JSON.parse(storedData) : [];
  } catch (e) {
    console.error("Error loading habits from localStorage:", e);
    return [];
  }
};

/**
 * Saves habits to localStorage.
 */
const saveHabits = (habits) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (e) {
    console.error("Error saving habits to localStorage:", e);
  }
};

// --- HABIT TRACKER COMPONENTS ---

const HabitItem = React.memo(({ habit, toggleHabit, last7Days, todayKey }) => {
  const isCheckedToday = habit.checkedDays.includes(todayKey);
  const isGood = habit.type === 'good';
  const completionText = isGood ? 'Completed' : 'Avoided';
  const actionText = isGood ? 'Mark Complete' : 'Mark Avoided';

  let currentStreak = 0;
  for (let i = last7Days.length - 1; i >= 0; i--) {
    if (habit.checkedDays.includes(last7Days[i])) {
      currentStreak++;
    } else {
      if (last7Days[i] !== todayKey) break;
    }
  }

  const adherenceBoxes = last7Days.map((date) => {
    const isLogged = habit.checkedDays.includes(date);
    const colorClass = isLogged ? (isGood ? 'bg-green-500' : 'bg-red-500') : (date === todayKey ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-200');

    return <div key={date} title={`${date}: ${isLogged ? completionText : 'Pending'}`} className={`w-3 h-3 rounded-sm mx-0.5 ${colorClass}`}></div>;
  });

  return (
    <div className={`bg-white p-4 rounded-xl shadow-md mb-4 transition-all duration-300 border-t-8 ${isGood ? 'border-green-400' : 'border-red-400'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          {isGood ? '✅' : '🚫'} {habit.name}
        </h3>
        <div className={`px-3 py-1 text-xs font-semibold rounded-full ${isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isGood ? 'Good Habit' : 'Bad Habit'}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <p className='font-medium'>History</p>
        <div className="flex">{adherenceBoxes}</div>
      </div>

      <div className='flex items-center justify-between pt-3 border-t border-gray-100'>
        <span className={`text-lg font-bold ${currentStreak > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
          {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'} Streak
        </span>

        <button
          onClick={() => toggleHabit(habit.id)}
          className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-colors shadow-md ${isCheckedToday
              ? isGood
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
        >
          {isCheckedToday ? (isGood ? <X className="w-5 h-5 mr-1" /> : <Check className="w-5 h-5 mr-1" />) : (isGood ? <Check className="w-5 h-5 mr-1" /> : <X className="w-5 h-5 mr-1" />)}
          {isCheckedToday ? `Undo ${completionText}` : actionText}
        </button>
      </div>
    </div>
  );
});

const AdherenceChart = ({ chartData }) => {
  return (
    <div className="p-4 bg-white rounded-xl shadow-lg mb-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" /> Weekly Adherence Snapshot
      </h3>
      <div className="h-20 bg-gray-100 rounded-lg flex items-end overflow-hidden p-1">
        {chartData.map((day, index) => (
          <div key={index} className="w-1/7 h-full flex flex-col justify-end px-1">
            <div
              className={`w-full rounded-t-sm transition-all duration-500 ${day.overallAdherence > 50 ? 'bg-blue-500' : 'bg-gray-400'}`}
              style={{ height: `${day.overallAdherence}%` }}
            ></div>
          </div>
        ))}
      </div>
      <p className='text-sm text-gray-500 mt-2 text-center'>Adherence % calculated over the last 7 days.</p>
    </div>
  );
};


// --- MAIN TRACKER COMPONENT (Local Storage Implemented) ---

const HabitTracker = () => {
  const [habits, setHabits] = useState(() => loadHabits()); // Load initial state from localStorage
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState('good');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const todayKey = useMemo(getTodayDateKey, []);
  const last7Days = useMemo(getLast7Days, []);
  const timeContext = useMemo(getTimeOfDay, []);

  // Save habits to localStorage whenever the habits state changes
  useEffect(() => {
    saveHabits(habits);
  }, [habits]);

  const goodHabits = useMemo(() => habits.filter(h => h.type === 'good'), [habits]);
  const badHabits = useMemo(() => habits.filter(h => h.type === 'bad'), [habits]);
  const pendingHabits = useMemo(() => habits.filter(h => !h.checkedDays.includes(todayKey)), [habits, todayKey]);

  const chartData = useMemo(() => {
    if (habits.length === 0) return last7Days.map(date => ({ date, overallAdherence: 0 }));

    return last7Days.map(dateKey => {
      const goodCount = goodHabits.length;
      const goodCompleted = goodHabits.filter(h => h.checkedDays.includes(dateKey)).length;

      const badCount = badHabits.length;
      const badAvoided = badHabits.filter(h => h.checkedDays.includes(dateKey)).length;

      const totalCount = goodCount + badCount;
      const totalLogged = goodCompleted + badAvoided;
      const overallAdherence = totalCount > 0 ? Math.round((totalLogged / totalCount) * 100) : 0;

      return { date: dateKey, overallAdherence };
    });
  }, [habits, last7Days, goodHabits, badHabits]);


  // --- Habit Management Actions (Local Storage Updates) ---

  const toggleHabit = useCallback((habitId) => {
    setHabits(prevHabits => {
      const newHabits = prevHabits.map(habit => {
        if (habit.id === habitId) {
          const isChecked = habit.checkedDays.includes(todayKey);
          let updatedCheckedDays = isChecked
            ? habit.checkedDays.filter((date) => date !== todayKey)
            : [...habit.checkedDays, todayKey].filter((v, i, a) => a.indexOf(v) === i);

          return { ...habit, checkedDays: updatedCheckedDays };
        }
        return habit;
      });
      return newHabits;
    });
  }, [todayKey]);

  const addHabit = (e) => {
    e?.preventDefault();

    if (newHabitName.trim().length === 0) {
      return;
    }

    const newHabitData = {
      id: Date.now().toString(), // Use timestamp as unique ID
      name: newHabitName.trim(),
      type: newHabitType,
      checkedDays: [],
      createdAt: new Date().toISOString(),
    };

    setHabits(prevHabits => [...prevHabits, newHabitData]);
    setNewHabitName('');
    setIsModalVisible(false);
    setNewHabitType('good');
  };

  // --- AI Logic (Simulated) ---
  const fetchRecommendations = async () => {
    // Since we removed the API key check, this is now always a simulated result
    setIsAiLoading(true);
    setAiRecommendations(null);

    // Simulated delay for AI response
    setTimeout(() => {
      setAiRecommendations("1. **Good Habit: Hydration Check (Morning)**. Scheduling Tip: Place a water bottle by your bed and drink it immediately upon waking.\n2. **Bad Habit: Mindless Social Scrolling (Avoidance)**. Strategy: Use an app blocker that activates 30 minutes after lunch and replace scrolling with a 5-minute stretching routine.\n3. **Good Habit: 10-Minute Tidy (Evening)**. Scheduling Tip: Immediately before watching TV, spend 10 minutes cleaning one area (kitchen sink, desk, desk, etc.).");
      setIsAiLoading(false);
    }, 1500);
  };

  // UI elements
  const reminderMessage = pendingHabits.length > 0
    ? `You have ${pendingHabits.length} habits left to log or avoid.`
    : `All clear! Your routine is complete for the ${timeContext.name}.`;

  const TimeIcon = timeContext.icon;
  const timeMessage = `Good ${timeContext.name}! ${timeContext.urgency}`;

  // DB Status Badge is updated to reflect Local Storage usage
  const dbStatus = { text: 'Local Storage Active', class: 'bg-blue-500 hover:bg-blue-600' };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans flex flex-col items-center">

      {/* Header and User Info */}
      <div className="w-full max-w-2xl bg-blue-600 p-6 rounded-t-2xl shadow-xl mb-4 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Habit Tracker</h1>
          <p className="text-sm text-blue-200 flex items-center">
            Data is saving automatically to your **browser's storage**.
          </p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          {/* Status Badge */}
          <div className={`flex items-center text-xs px-3 py-1 text-white rounded-full font-semibold transition-colors ${dbStatus.class}`}>
            <Zap className='w-3 h-3 mr-1' /> {dbStatus.text}
          </div>
        </div>
      </div>

      {/* Contextual Reminder/Daily Status */}
      <div className="w-full max-w-2xl bg-yellow-50 border border-yellow-300 p-4 rounded-xl shadow-md mb-4">
        <p className="font-bold text-yellow-800 flex items-center">
          <TimeIcon className={`w-5 h-5 mr-2 ${timeContext.color}`} />
          {timeMessage}
        </p>
        <p className='mt-2 text-sm text-yellow-700 font-medium'>{reminderMessage}</p>
      </div>

      {/* Adherence Chart */}
      <div className="w-full max-w-2xl mb-8">
        {habits.length > 0 && <AdherenceChart chartData={chartData} />}
      </div>

      {/* Habit Lists */}
      <div className="w-full max-w-2xl mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-3 border-b-2 pb-2 border-gray-200">
          Good Habits (To Do)
        </h2>
        {goodHabits.length === 0 && <p className="text-gray-500 p-4 bg-white rounded-lg">No good habits set yet. Add a new habit using the red '+' button.</p>}
        {goodHabits.map(habit => (
          // We removed habit.id in previous Firebase version, adding it back here
          <HabitItem key={habit.id} habit={habit} toggleHabit={toggleHabit} last7Days={last7Days} todayKey={todayKey} />
        ))}
      </div>

      <div className="w-full max-w-2xl mb-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-3 border-b-2 pb-2 border-gray-200">
          Bad Habits (To Avoid)
        </h2>
        {badHabits.length === 0 && <p className="text-gray-500 p-4 bg-white rounded-lg">No bad habits set yet. Add a bad habit like 'Mindless Scrolling' to start avoiding it.</p>}
        {badHabits.map(habit => (
          // We removed habit.id in previous Firebase version, adding it back here
          <HabitItem key={habit.id} habit={habit} toggleHabit={toggleHabit} last7Days={last7Days} todayKey={todayKey} />
        ))}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 lg:right-[calc((100vw-768px)/2)] flex flex-col space-y-4">
        <button
          className="w-14 h-14 bg-purple-500 rounded-full shadow-2xl flex items-center justify-center hover:bg-purple-600 transition-all duration-300 transform hover:scale-105"
          onClick={() => { fetchRecommendations(); setIsAiModalVisible(true); }}
          title="AI Coach Recommendations"
        >
          <Brain className="text-white w-7 h-7" />
        </button>
        <button
          className="w-14 h-14 bg-red-500 rounded-full shadow-2xl flex items-center justify-center hover:bg-red-600 transition-all duration-300 transform hover:scale-105"
          onClick={() => setIsModalVisible(true)}
          title="Add New Habit"
        >
          <Plus className="text-white w-8 h-8" />
        </button>
      </div>

      {/* New Habit Modal */}
      {isModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-20" onClick={() => setIsModalVisible(false)}>
          <form className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()} onSubmit={addHabit}>
            <h2 className="text-2xl font-bold text-gray-800 mb-5">Add New Habit</h2>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Habit Name</label>
              <input type="text" className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="e.g., Cycle for 30 minutes" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} autoFocus />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Habit Type</label>
              <div className="flex space-x-4">
                <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${newHabitType === 'good' ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'}`}>
                  <input type="radio" name="habitType" value="good" checked={newHabitType === 'good'} onChange={() => setNewHabitType('good')} className="mr-2 h-4 w-4 text-green-500 focus:ring-green-500" />
                  <span className="font-medium text-gray-800">Good (To Do)</span>
                </label>
                <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${newHabitType === 'bad' ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}`}>
                  <input type="radio" name="habitType" value="bad" checked={newHabitType === 'bad'} onChange={() => setNewHabitType('bad')} className="mr-2 h-4 w-4 text-red-500 focus:ring-red-500" />
                  <span className="font-medium text-gray-800">Bad (To Avoid)</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium" onClick={() => setIsModalVisible(false)}>Cancel</button>
              <button type="submit" className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${newHabitName.trim().length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'}`} disabled={newHabitName.trim().length === 0}>Create Habit</button>
            </div>
          </form>
        </div>
      )}

      {/* AI Modal */}
      {isAiModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-20" onClick={() => setIsAiModalVisible(false)}>
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} >
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2"><Brain className="w-6 h-6 mr-2 text-purple-600" /> AI Habit Coach</h2>
            {isAiLoading ? (
              <div className="flex flex-col items-center justify-center h-40">
                <Plus className="w-8 h-8 animate-spin text-purple-500" /> {/* Reusing Plus for a quick spinner icon */}
                <p className="mt-3 text-gray-600">Generating contextualized plans and strategies...</p>
              </div>
            ) : (
              <div className="prose max-w-none text-gray-700">
                <p className='text-sm italic text-gray-500 mb-4'>The coach provided these strategies based on your current habits and the **{timeContext.name}** context:</p>
                <div dangerouslySetInnerHTML={{ __html: aiRecommendations.replace(/\n/g, '<br/>') }} />
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button type="button" className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium" onClick={() => setIsAiModalVisible(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App is now just the HabitTracker
const App = () => {
  return (
    <div className="min-h-screen font-sans">
      <style>
        {`
                body {
                    text-size-adjust: 100%;
                    -webkit-text-size-adjust: 100%;
                }
                `}
      </style>
      <HabitTracker />
    </div>
  );
};

export default App;