require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initFirebase, getDb, COLLECTIONS, serverTimestamp } = require('../config/firebase');

initFirebase();

const seedData = async () => {
  const db = getDb();
  console.log('🌱 Seeding database...');

  // ======= Super Admin =======
  const adminPass = await bcrypt.hash('Admin@1234', 12);
  const adminRef = await db.collection(COLLECTIONS.USERS).add({
    name: 'Super Admin',
    email: 'admin@grievanceportal.gov.in',
    password: adminPass,
    role: 'super_admin',
    isActive: true,
    isVerified: true,
    state: 'andhra pradesh',
    district: 'guntur',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  console.log('✅ Super Admin created:', adminRef.id);

  // ======= Authorities =======
  const authorities = [
    { name: 'Guntur PS', type: 'ps', email: 'ps.guntur@ap.gov.in', phone: '9876543210', state: 'andhra pradesh', district: 'guntur', lat: 16.3067, lng: 80.4365 },
    { name: 'Vijayawada PS', type: 'ps', email: 'ps.vijayawada@ap.gov.in', phone: '9876543211', state: 'andhra pradesh', district: 'krishna', lat: 16.5062, lng: 80.6480 },
    { name: 'AP ACB Guntur', type: 'acb', email: 'acb.guntur@ap.gov.in', phone: '9876543212', state: 'andhra pradesh', district: 'guntur', lat: 16.3067, lng: 80.4365 },
    { name: 'Guntur Municipal Corp', type: 'municipal', email: 'municipal.guntur@ap.gov.in', phone: '9876543213', state: 'andhra pradesh', district: 'guntur', lat: 16.3067, lng: 80.4365 },
    { name: 'Hyderabad PS', type: 'ps', email: 'ps.hyderabad@telangana.gov.in', phone: '9876543214', state: 'telangana', district: 'hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Telangana ACB', type: 'acb', email: 'acb.hyd@telangana.gov.in', phone: '9876543215', state: 'telangana', district: 'hyderabad', lat: 17.3850, lng: 78.4867 },
  ];

  for (const auth of authorities) {
    const pass = await bcrypt.hash('Authority@1234', 12);
    const role = auth.type === 'ps' ? 'ps_officer' : auth.type === 'acb' ? 'acb_officer' : 'municipal_officer';
    const email = auth.email;

    const authorityRef = await db.collection(COLLECTIONS.AUTHORITIES).add({
      name: auth.name,
      email,
      phone: auth.phone,
      type: auth.type,
      isActive: true,
      jurisdiction: { state: auth.state, district: auth.district, districts: [auth.district] },
      location: { lat: auth.lat, lng: auth.lng },
      createdAt: serverTimestamp(),
    });

    await db.collection(COLLECTIONS.USERS).add({
      name: auth.name,
      email,
      password: pass,
      phone: auth.phone,
      role,
      authorityType: auth.type,
      authorityId: authorityRef.id,
      jurisdiction: { state: auth.state, district: auth.district },
      isActive: true,
      isVerified: true,
      state: auth.state,
      district: auth.district,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Authority created: ${auth.name} (${auth.type.toUpperCase()})`);
  }

  // ======= Sample Citizen =======
  const citizenPass = await bcrypt.hash('Citizen@1234', 12);
  await db.collection(COLLECTIONS.USERS).add({
    name: 'Ravi Kumar',
    email: 'citizen@example.com',
    password: citizenPass,
    phone: '9000000001',
    role: 'citizen',
    state: 'andhra pradesh',
    district: 'guntur',
    isActive: true,
    isVerified: true,
    complaintsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  console.log('✅ Sample citizen created');

  console.log('\n🎉 Seeding complete!\n');
  console.log('📋 Test Credentials:');
  console.log('  Super Admin:  admin@grievanceportal.gov.in / Admin@1234');
  console.log('  PS Officer:   ps.guntur@ap.gov.in / Authority@1234');
  console.log('  ACB Officer:  acb.guntur@ap.gov.in / Authority@1234');
  console.log('  Citizen:      citizen@example.com / Citizen@1234');

  process.exit(0);
};

seedData().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
