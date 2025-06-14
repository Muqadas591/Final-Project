import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('../firebase/mental-health-app-68c4b-firebase-adminsdk-fbsvc-18a9b4b239.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

env_data = {
    'forest': {
        "Predicted environment_id": "0",
        'title': 'Peaceful Forest',
        'description': 'A serene forest environment with gentle sounds of nature. The combination of green surroundings and natural light has been shown to reduce anxiety and promote mindfulness.',
        'benefits': ['Reduces stress and anxiety', 'Promotes mindfulness and presence', 'Improves mood and emotional well-being'],
        'imageUrl': 'https://images.unsplash.com/photo-1448375240586-882707db888b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        'duration': '20min',
        'videoUrl' : 'https://drive.google.com/file/d/1mLnT8ez7RbPJhn5Usm-txP-ZG2QatxVr/view?usp=drive_link',
        'videoUrl1':'https://drive.google.com/file/d/1RCSdfNlJJ4sLKrl4Qy6vAGaeo2a8UoMu/view?usp=drive_link',
        'videoUrl2':'https://youtu.be/embed/F4hQjbrOebs',  
            },
    'social exposure': {
        "Predicted environment_id": "1",
        'title': 'Social Exposure',
        'description': 'A virtual environment designed for social exposure therapy. This setting helps individuals confront their fears in a controlled manner, reducing anxiety over time.',
        'benefits': ['Reduces social anxiety', 'Builds confidence in social situations', 'Improves social skills'],
         'imageUrl': 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        'duration': '30min',
        'videoUrl' : 'https://drive.google.com/file/d/1s_DDQXexjkboQdbTA-GOIJVGEtEUaW8Z/view?usp=drive_link',
            },
    'beach': {
        "Predicted environment_id": "2",
        'title': 'Tranquil Beach',
        'description': 'A calming beach scene with gentle waves and warm sunlight. The sound of waves has been proven to alter brain wave patterns, inducing a deeply relaxed state.',
        'benefits': ['Induces deep relaxation', 'Improves sleep quality', 'Reduces symptoms of depression'],
        'imageUrl': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        'duration': '15min',
        'videoUrl' : 'https://youtu.be/embed/j6P6DQ3WnqQ',
        'videoUrl1':'https://youtu.be/embed/SctOF4TnVMA',


    },
    'mountains': {
        "Predicted environment_id": "3",
        'title': 'Mountain Retreat',
        'description': 'A breathtaking mountain vista with crisp air and panoramic views. This environment helps create perspective and a sense of awe that can reduce rumination.',
        'benefits': ['Creates mental perspective', 'Reduces rumination and negative thoughts', 'Increases feelings of awe and wonder'],
        'imageUrl': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'duration': '25min',
        'videoUrl' : 'https://youtu.be/embed/QVGwC-tywO4',
        'videoUrl1':'https://youtu.be/embed/YolaW-27tOo',

    },
    'Rainforest': {
        "Predicted environment_id": "4",
        'title': 'Rainforest',
        'description': 'A serene rainforest environment with the sound of rain. The combination of rain and nature has been shown to reduce anxiety and promote mindfulness.',
        'benefits': ['Reduces stress and anxiety', 'Promotes mindfulness and presence', 'Improves mood and emotional well-being'],
        'imageUrl': 'https://images.unsplash.com/photo-1560851691-ebb64b584d3d?q=80&w=1499&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'duration': '15min',
        'videoUrl' : 'https://youtu.be/embed/eNUpTV9BGac',
        'videoUrl1':'https://youtu.be/embed/RzVvThhjAKw',
        'videoUrl2':'https://youtu.be/embed/0fjo9ZwpepA',
    },
    'garden': {
        "Predicted environment_id": "5",
        'title': 'Japanese Garden',
        'description': 'A meticulously designed Japanese garden with balanced elements and flowing water. The ordered nature of this environment helps calm a busy mind.',
        'benefits': ['Promotes mental clarity and focus', 'Reduces mental clutter', 'Encourages balanced thinking'],
        'imageUrl': 'https://plus.unsplash.com/premium_photo-1661954483883-edd65eac3577?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'duration': '18min',
        'videoUrl' : 'https://youtu.be/embed/Z8XCv-Svyjw',
        'videoUrl1':'https://youtu.be/embed/zXH_RukM04E',
        'videoUrl2':'https://youtu.be/embed/ky5uvjPVhk8',
    },
    'Self Affirmation': {
        "Predicted environment_id": "6",
        'title': 'Self-Affirmation',
        'description': 'A calming self-affirmation session where individuals affirm their strengths and weaknesses.',
        'benefits': ['Boosts self-esteem', 'Reduces negative self-talk', 'Encourages self-acceptance'],
        'imageUrl': 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        'duration': '20min',
        'videoUrl' : 'https://drive.google.com/file/d/1gtyUTbb6njXlKcTJonEkw8bu80L1DNeA/view?usp=drive_link',
        'videoUrl1':'https://drive.google.com/file/d/1tzPetU4ZVcQVLJIxd8Om-GKeb5P8ljL2/view?usp=drive_link',
    },
    'sunlight therapy': {
        "Predicted environment_id": "7",
        'title': 'Sunlight Therapy',
        'description': 'A virtual environment designed for sunlight therapy. This setting helps individuals confront their fears in a controlled manner, reducing anxiety over time.',
        'benefits': ['Reduces social anxiety', 'Builds confidence in social situations', 'Improves social skills'],
        'imageUrl': 'https://plus.unsplash.com/premium_photo-1720760950804-729e3043a1ad?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'duration': '30min',
        'videoUrl' : 'https://youtu.be/embedd/6rjTMdi37Kc',
    },
    'Decision Making': {
        "Predicted environment_id": "8",
        'title': 'Decision Making',
        'description': 'A virtual environment designed for decision-making therapy. This setting helps individuals confront their fears in a controlled manner, reducing anxiety over time.',
        'benefits': ['Reduces social anxiety', 'Builds confidence in social situations', 'Improves social skills'],
        'imageUrl': 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        'duration': '30min',
        'videoUrl' : '',
    },
    'Emotional Bonding': {
        "Predicted environment_id": "9",
        'title': 'Emotional Bonding',
        'description': 'A virtual environment designed for emotional bonding therapy. This setting helps individuals confront their fears in a controlled manner, reducing anxiety over time.',
        'benefits': ['Reduces social anxiety', 'Builds confidence in social situations', 'Improves social skills'],
        'imageUrl': 'https://image.marriage.com/advice/wp-content/uploads/2020/07/expert-tips-to-improve-emotional-connection-with-your-partner.jpg',
        'duration': '30min',
        'videoUrl' : 'https://drive.google.com/file/d/12dCp-q6KVN8plTbb-RHMfz59hENCS-DT/view?usp=drive_link',

    },
    'Guided Nature Walk': {
        "Predicted environment_id": "10",
        'title': 'Guided Nature Walk',
        'description': 'A virtual guided walk through a serene forest. This environment helps individuals connect with nature and promotes mindfulness.',
        'benefits': ['Reduces stress and anxiety', 'Promotes mindfulness and presence', 'Improves mood and emotional well-being'],
        'imageUrl': 'https://images.unsplash.com/photo-1586859581315-f6c7474865f7?q=80&w=1631&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'duration': '20min',
        'videoUrl' : 'https://drive.google.com/file/d/1e9aI7_E4dZXdT87GwalAo3tFuP_4-0v2/view?usp=drive_link',
        'videoUrl1':'https://youtu.be/embed/U1j-eO3-aR8',
        'videoUrl2':'https://youtu.be/embed/U1j-eO3-aR8',
        'videoUrl3':'https://youtu.be/embed/Pt6_x3rFPw0',
    },
    'Starry Night': {
        "Predicted environment_id": "11",
        'title': 'Starry Night',
        'description': 'A serene night sky with stars and a gentle breeze. This environment has been shown to reduce anxiety and promote mindfulness.',
        'benefits': ['Reduces stress and anxiety', 'Promotes mindfulness and presence', 'Improves mood and emotional well-being'],
        'imageUrl': 'https://plus.unsplash.com/premium_photo-1700141482421-0840fecfcdbc?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'duration': '20min',
        'videoUrl' : '',
    },
    'virtual_room': {
        "Predicted environment_id": "12",
        'title': 'Virtual Room',
        'description': 'A safe space for exposure therapy.',
        'benefits': ['Reduces social anxiety', 'Builds confidence'],
        'imageUrl': 'https://media.istockphoto.com/id/1329269972/photo/woman-creating-art-in-vr-environment.jpg?s=2048x2048&w=is&k=20&c=Ge0BRizYr0l4oH4biDQGYv7EsgYvjQbJcInYRaUWUHw=',
        'duration': '20min',
        'videoUrl' : 'https://drive.google.com/file/d/1s_DDQXexjkboQdbTA-GOIJVGEtEUaW8Z/view?usp=drive_link',
        'videoUrl2':'',
         'guidanceAudioUrl': 'https://drive.google.com/file/d/1iLja9g1woqjINKFa6DwGGiz-8lpfFfkG/view?usp=drive_link',
    },
    'meadow': {
        "Predicted environment_id": "13",
        'title': 'Vast Green Meadow',
        'description': 'An open meadow with soft breezes.',
        'benefits': ['Encourages openness', 'Reduces tension'],
        'imageUrl': 'https://plus.unsplash.com/premium_photo-1667423049497-291580083466?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'duration': '22min',
        'videoUrl' : 'https://youtu.be/embed/QVGwC-tywO4',
        'videoUrl1':'https://youtu.be/embed/vnAK0WkEnKU',
        'videoUrl2':'https://youtu.be/embed/F4hQjbrOebs',
        'videoUrl3':'https://youtu.be/embed/Pt6_x3rFPw0',
    },
    'virtual_city': {
        "Predicted environment_id": "14",
        'title': 'Virtual City',
        'description': 'Urban exposure for agoraphobia.',
        'benefits': ['Reduces fear of crowds', 'Builds resilience'],
        'imageUrl': 'https://images.unsplash.com/photo-1601415650610-37070c1e3c35?q=80&w=1467&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'duration': '20min'
    },
    'cozy_cabin': {
        "Predicted environment_id": "15",
        'title': 'Cozy Cabin in Mountains',
        'description': 'A warm cabin with mountain views.',
        'benefits': ['Promotes coziness', 'Reduces burnout'],
        'imageUrl': 'https://plus.unsplash.com/premium_photo-1670963963921-a2da81ee17c7?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'duration': '25min',
        
    },
    'forest_path': {
        "Predicted environment_id": "16",
        'title': 'Forest Path',
        'description': 'A guided walk through nature.',
        'benefits': ['Promotes relaxation', 'Reduces stress'],
        'imageUrl': 'https://images.unsplash.com/photo-1592859600972-1b0834d83747?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'duration': '22min',
        'videoUrl' : 'https://youtu.be/embed/QVGwC-tywO4',
        'videoUrl1':'https://youtu.be/embed/vnAK0WkEnKU',
        'videoUrl2':'https://youtu.be/embed/F4hQjbrOebs',
    },
    'ocean_shore': {
        "Predicted environment_id": "17",
        'title': 'Ocean Shore',
        'description': 'Calming waves with breathing exercises.',
        'benefits': ['Reduces PTSD symptoms', 'Promotes calm'],
        'imageUrl': 'https://images.unsplash.com/photo-1507230162893-481b82edf900?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'duration': '20min',
        'videoUrl' : 'https://youtu.be/v6VWv61kK1g',
        'videoUrl1':'https://youtu.be/b4AkjHqDDK8',


    },
   
}

for env_id, details in env_data.items():
    db.collection('environments').document(env_id).set(details)
print("Environments seeded to Firestore")