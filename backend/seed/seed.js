const User = require('../models/User');
const SchoolClass = require('../models/SchoolClass');

async function seedData() {
  try {
    const teacherExists = await User.findOne({ username: 'teacher' });
    if (!teacherExists) {
      await User.create({
        name: 'Jean Pierre Mugabo',
        email: 'teacher@ai-assessment-tool.rw',
        username: 'teacher',
        password: 'teacher123',
        title: 'Senior Teacher of Mathematics',
        role: 'teacher',
        assignedClass: 'S2',
        courses: [
          { subject: 'Mathematics', className: 'S1' },
          { subject: 'Mathematics', className: 'S2' },
          { subject: 'Physics', className: 'S3' },
          { subject: 'English', className: 'P6' },
        ],
      });
      console.log('Seeded demo teacher account (teacher / teacher123).');
    }

    const leaderExists = await User.findOne({ username: 'leader' });
    if (!leaderExists) {
      await User.create({
        name: 'Vestine Uwimana',
        email: 'leader@ai-assessment-tool.rw',
        username: 'leader',
        password: 'leader123',
        title: 'Head Teacher',
        role: 'leader',
        assignedClass: 'S3',
      });
      console.log('Seeded demo leader account (leader / leader123).');
    }

    const ALL_CLASSES = [
      { name: 'Nursery', level: 'Nursery' },
      { name: 'P1', level: 'Primary' },
      { name: 'P2', level: 'Primary' },
      { name: 'P3', level: 'Primary' },
      { name: 'P4', level: 'Primary' },
      { name: 'P5', level: 'Primary' },
      { name: 'P6', level: 'Primary' },
      { name: 'S1', level: 'Secondary' },
      { name: 'S2', level: 'Secondary' },
      { name: 'S3', level: 'Secondary' },
      { name: 'S4', level: 'Secondary' },
      { name: 'S5', level: 'Secondary' },
      { name: 'S5 MEG', level: 'Secondary', combination: 'MEG' },
      { name: 'S5 HEG', level: 'Secondary', combination: 'HEG' },
      { name: 'S5 TVT', level: 'Secondary', combination: 'TVT' },
      { name: 'S6', level: 'Secondary' },
      { name: 'S6 MEG', level: 'Secondary', combination: 'MEG' },
      { name: 'S6 HEG', level: 'Secondary', combination: 'HEG' },
      { name: 'S6 TVT', level: 'Secondary', combination: 'TVT' },
      { name: 'Year 1', level: 'University' },
      { name: 'Year 2', level: 'University' },
      { name: 'Year 3', level: 'University' },
      { name: 'Year 4', level: 'University' },
    ];
    const existingClasses = new Set((await SchoolClass.find({}, 'name')).map((c) => c.name));
    const missingClasses = ALL_CLASSES.filter((c) => !existingClasses.has(c.name));
    if (missingClasses.length > 0) {
      await SchoolClass.insertMany(missingClasses);
      console.log(`Seeded ${missingClasses.length} missing class(es): ${missingClasses.map((c) => c.name).join(', ')}`);
    }
    // Keep existing class levels in sync with the current level names
    await Promise.all(
      ALL_CLASSES.map((c) => SchoolClass.updateOne({ name: c.name }, { $set: { level: c.level, combination: c.combination || '' } }))
    );

    console.log('Database seeding complete.');
  } catch (error) {
    console.error('Seeding error:', error.message);
  }
}

module.exports = seedData;
