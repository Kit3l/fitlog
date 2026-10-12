'use strict';
/*
  Default training program (the 5-day split from the plan). Every profile gets its own editable copy.
  Exercise types: weight (kg x reps), time (seconds), cardio (minutes + level), run (km + minutes).
  group: upper or lower decides the default progression step (2.5 kg upper, 5 kg lower) unless inc is set.
  reps is a rep range such as "6-8"; for time it is seconds, for cardio it is minutes.
*/
(function () {
  const W = (name, sets, reps, group, inc) => ({ name, type: 'weight', group, sets, reps, inc });
  window.DEFAULT_PROGRAM = {
    name: 'Fat-loss 5-day split',
    days: [
      { dow: 0, name: 'Sunday run', kind: 'light', exercises: [
        { name: 'Easy run', type: 'run', group: 'cardio', sets: 1, reps: '5-7.5' }
      ]},
      { dow: 1, name: 'Lower A: posterior chain', kind: 'gym', exercises: [
        W('Hip thrust', 4, '8-10', 'lower', 5),
        W('Lying leg curl', 4, '10-12', 'lower', 2.5),
        W('45° back extension', 3, '10-12', 'lower', 2.5),
        W('Cable pull-through', 3, '12-15', 'lower', 2.5),
        W('Standing calf raise', 3, '10-15', 'lower', 5),
        { name: 'Plank', type: 'time', group: 'core', sets: 3, reps: '45-60' },
        W('Cable or dumbbell curl', 3, '10-12', 'upper', 1)
      ]},
      { dow: 2, name: 'Upper A: back focus', kind: 'gym', exercises: [
        W('Pull-up or wide-grip lat pulldown', 4, '6-10', 'upper', 2.5),
        W('Barbell or chest-supported row', 3, '8-10', 'upper', 2.5),
        W('Seated cable row, neutral grip', 3, '10-12', 'upper', 2.5),
        W('Straight-arm pulldown', 2, '12-15', 'upper', 2.5),
        W('Machine chest press', 3, '10-12', 'upper', 2.5),
        W('Cable fly or pec deck', 2, '12-15', 'upper', 2.5),
        W('Rope triceps pushdown', 3, '10-12', 'upper', 2.5)
      ]},
      { dow: 3, name: 'Arms and shoulders', kind: 'gym', exercises: [
        W('Seated dumbbell shoulder press', 4, '8-10', 'upper', 2),
        W('Lateral raise', 4, '12-15', 'upper', 1),
        W('Rear delt fly', 3, '12-15', 'upper', 1),
        W('EZ-bar curl', 3, '8-10', 'upper', 2.5),
        W('Incline dumbbell curl', 3, '10-12', 'upper', 1),
        W('Hammer curl', 2, '10-12', 'upper', 1),
        W('Overhead triceps extension', 3, '10-12', 'upper', 2.5),
        W('Straight-bar cable pushdown', 2, '12-15', 'upper', 2.5),
        { name: 'Stair master', type: 'cardio', group: 'cardio', sets: 1, reps: '30' }
      ]},
      { dow: 4, name: 'Lower B: quad focus', kind: 'gym', exercises: [
        W('Back squat', 4, '6-8', 'lower', 5),
        W('Leg press, feet low and close', 3, '10-12', 'lower', 5),
        W('Bulgarian split squat (each leg)', 3, '8-10', 'lower', 2),
        W('Leg extension', 3, '12-15', 'lower', 2.5),
        W('Seated calf raise', 3, '12-15', 'lower', 2.5),
        { name: 'Hanging leg raise', type: 'weight', group: 'core', sets: 3, reps: '10-15', inc: 0 }
      ]},
      { dow: 5, name: 'Upper B: chest focus', kind: 'gym', exercises: [
        W('Barbell bench press', 4, '6-8', 'upper', 2.5),
        W('Incline dumbbell press', 3, '8-10', 'upper', 2),
        W('Weighted dips or machine chest press', 3, '8-12', 'upper', 2.5),
        W('Cable fly, low to high', 2, '12-15', 'upper', 2.5),
        W('Chest-supported row', 3, '8-10', 'upper', 2.5),
        W('Lat pulldown, neutral grip', 3, '10-12', 'upper', 2.5),
        W('EZ-bar skullcrusher', 3, '8-10', 'upper', 2.5),
        W('Rope triceps pushdown', 3, '10-12', 'upper', 2.5)
      ]},
      { dow: 6, name: 'Rest day', kind: 'light', exercises: [] }
    ]
  };
})();
