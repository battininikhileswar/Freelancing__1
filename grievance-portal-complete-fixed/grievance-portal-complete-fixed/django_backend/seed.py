import os
import django
import sys

# Configure settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grievance_portal.settings')
django.setup()

from api.models import User, Authority

def seed_db():
    print("--- Seeding Django SQLite database ---")

    # Clear existing data to prevent duplications
    User.objects.all().delete()
    Authority.objects.all().delete()

    # ======= Super Admin =======
    super_admin = User(
        email='admin@grievanceportal.gov.in',
        role='super_admin',
        is_active=True,
        is_verified=True,
        state='andhra pradesh',
        district='guntur',
        is_staff=True,
        is_superuser=True
    )
    super_admin.set_password('Admin@1234')
    super_admin.name = 'Super Admin'
    super_admin.save()
    print(f"User Super Admin created: {super_admin.id}")

    # ======= Authorities =======
    authorities_data = [
        { 'name': 'Guntur PS', 'type': 'ps', 'email': 'ps.guntur@ap.gov.in', 'phone': '9876543210', 'state': 'andhra pradesh', 'district': 'guntur', 'lat': 16.3067, 'lng': 80.4365 },
        { 'name': 'Vijayawada PS', 'type': 'ps', 'email': 'ps.vijayawada@ap.gov.in', 'phone': '9876543211', 'state': 'andhra pradesh', 'district': 'krishna', 'lat': 16.5062, 'lng': 80.6480 },
        { 'name': 'AP ACB Guntur', 'type': 'acb', 'email': 'acb.guntur@ap.gov.in', 'phone': '9876543212', 'state': 'andhra pradesh', 'district': 'guntur', 'lat': 16.3067, 'lng': 80.4365 },
        { 'name': 'Guntur Municipal Corp', 'type': 'municipal', 'email': 'municipal.guntur@ap.gov.in', 'phone': '9876543213', 'state': 'andhra pradesh', 'district': 'guntur', 'lat': 16.3067, 'lng': 80.4365 },
        { 'name': 'Hyderabad PS', 'type': 'ps', 'email': 'ps.hyderabad@telangana.gov.in', 'phone': '9876543214', 'state': 'telangana', 'district': 'hyderabad', 'lat': 17.3850, 'lng': 78.4867 },
        { 'name': 'Telangana ACB', 'type': 'acb', 'email': 'acb.hyd@telangana.gov.in', 'phone': '9876543215', 'state': 'telangana', 'district': 'hyderabad', 'lat': 17.3850, 'lng': 78.4867 },
    ]

    for auth in authorities_data:
        # Create Authority entry
        authority_entry = Authority(
            name=auth['name'],
            email=auth['email'],
            phone=auth['phone'],
            type=auth['type'],
            is_active=True,
            jurisdiction={
                'state': auth['state'],
                'district': auth['district'],
                'districts': [auth['district']]
            },
            location={
                'lat': auth['lat'],
                'lng': auth['lng']
            }
        )
        authority_entry.save()

        # Create corresponding User account
        role_map = {
            'ps': 'ps_officer',
            'acb': 'acb_officer',
            'municipal': 'municipal_officer'
        }
        
        authority_user = User(
            email=auth['email'],
            phone=auth['phone'],
            role=role_map[auth['type']],
            authority_type=auth['type'],
            authority_id=authority_entry.id,
            jurisdiction={
                'state': auth['state'],
                'district': auth['district']
            },
            is_active=True,
            is_verified=True,
            state=auth['state'],
            district=auth['district']
        )
        authority_user.set_password('Authority@1234')
        authority_user.name = auth['name']
        authority_user.save()

        print(f"Authority created: {auth['name']} ({auth['type'].upper()}) - ID: {authority_entry.id}")

    # ======= Sample Citizen =======
    citizen = User(
        email='citizen@example.com',
        phone='9000000001',
        role='citizen',
        state='andhra pradesh',
        district='guntur',
        is_active=True,
        is_verified=True,
        complaints_count=0
    )
    citizen.set_password('Citizen@1234')
    citizen.name = 'Ravi Kumar'
    citizen.save()
    print(f"Sample citizen created: {citizen.id}")

    print("\n--- Seeding complete! Database is ready to use. ---\n")


if __name__ == '__main__':
    seed_db()
