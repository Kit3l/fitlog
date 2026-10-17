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

  /*
    Field sessions, for trips with no gym: bands, bodyweight and a guesthouse room.
    They have a negative dow, so they never belong to a weekday and never load on their own.
    Pick one from the Session list on the Lifts screen and rotate A, B, C, D in order.
    Band work has no kilograms, so inc is 0: the app then nudges you on reps and tempo
    instead of weight. Log the band level in the kg box if you like (1 light, 2 medium, 3 heavy).
    Each session ends with the 10-exercise circuit, 30 seconds on and 30 seconds off,
    2 to 3 rounds, which takes the session to about an hour.
  */
  const B = (name, sets, reps) => ({ name, type: 'weight', group: 'upper', sets, reps, inc: 0 });
  const L = (name, sets, reps) => ({ name, type: 'weight', group: 'lower', sets, reps, inc: 0 });
  const CIRCUIT = () => ({ name: 'Bodyweight circuit (minutes, rounds)', type: 'cardio', group: 'cardio', sets: 1, reps: '20' });

  window.FIELD_SESSIONS = [
    { dow: -1, name: 'Field A: lower, posterior', kind: 'gym', exercises: [
      L('Single-leg hip thrust, shoulders on bed (each leg)', 4, '10-15'),
      L('Band Romanian deadlift', 4, '15-20'),
      L('Band lying leg curl (each leg)', 3, '15-20'),
      L('Band good morning', 3, '15-20'),
      L('Single-leg calf raise on a step (each leg)', 4, '15-25'),
      { name: 'Plank', type: 'time', group: 'core', sets: 3, reps: '45-60' },
      B('Band curl', 3, '15-20'),
      CIRCUIT()
    ]},
    { dow: -2, name: 'Field B: upper, back focus', kind: 'gym', exercises: [
      B('Band lat pulldown, high anchor', 4, '12-20'),
      B('Band bent-over row', 4, '12-20'),
      B('Inverted row under a table', 3, '8-15'),
      B('Band pull-apart', 3, '20-25'),
      B('Push-up', 3, '10-20'),
      B('Band chest press', 3, '12-20'),
      B('Band overhead triceps extension', 3, '15-20'),
      CIRCUIT()
    ]},
    { dow: -3, name: 'Field C: lower, quad focus', kind: 'gym', exercises: [
      L('Bulgarian split squat, rear foot on a chair (each leg)', 4, '10-15'),
      L('Band squat', 4, '15-20'),
      L('Reverse lunge (each leg)', 3, '12-15'),
      L('Step-up onto a chair (each leg)', 3, '12-15'),
      { name: 'Wall sit', type: 'time', group: 'lower', sets: 3, reps: '45-60' },
      L('Standing calf raise, slow', 3, '20-25'),
      { name: 'Lying leg raise', type: 'weight', group: 'core', sets: 3, reps: '12-20', inc: 0 },
      CIRCUIT()
    ]},
    { dow: -4, name: 'Field D: upper, chest focus', kind: 'gym', exercises: [
      B('Feet-elevated push-up', 4, '8-15'),
      B('Band chest press', 4, '12-20'),
      B('Band fly', 3, '15-20'),
      B('Band bent-over row', 3, '15-20'),
      B('Band lat pulldown, high anchor', 3, '15-20'),
      B('Band overhead press', 3, '12-15'),
      B('Band triceps pressdown', 3, '15-20'),
      CIRCUIT()
    ]}
  ];
  window.DEFAULT_PROGRAM.days = window.DEFAULT_PROGRAM.days.concat(window.FIELD_SESSIONS);
})();
