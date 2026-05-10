// Source file for Majors.
export type MajorGroup = {
  college: string
  majors: string[]
}

export type MajorRow = {
  college: string
  major_name: string
  college_sort_order?: number | null
  major_sort_order?: number | null
}

export const MAJOR_GROUPS: MajorGroup[] = [
  {
    college: 'College of the Arts (COTA)',
    majors: [
      'Art (BA) - Art Education',
      'Art (BA) - Art History',
      'Art (BA) - Studio Art',
      'Art (BFA) - Ceramics',
      'Art (BFA) - Drawing & Painting',
      'Art (BFA) - Graphic Design',
      'Art (BFA) - Illustration/Animation',
      'Art (BFA) - Photography',
      'Art (BFA) - Printmaking',
      'Art (BFA) - 3-D Media',
      'Dance (BA/BFA)',
      'Dance Science (BS)',
      'Industrial Design (BS)',
      'Interior Design (BFA)',
      'Cinematic Arts (BA)',
      'Music (BM) - Composition',
      'Music Education: Choral-Vocal (BM)',
      'Music Education: Instrumental Music (BM)',
      'Music Performance (BM)',
      'Theatre Arts - Technical Theatre',
    ],
  },
  {
    college: 'College of Business (COB)',
    majors: [
      'Business Administration (BS) - Accountancy',
      'Business Administration (BS) - Finance',
      'Business Administration (BS) - Information Systems',
      'Business Administration (BS) - International Business',
      'Business Administration (BS) - Management',
      'Business Administration (BS) - Marketing',
      'Business Administration (BS) - Operations and Supply Chain Management',
    ],
  },
  {
    college: 'College of Education (CED)',
    majors: [
      'Liberal Studies (BA)',
      'Single Subject Teacher Credential Program',
    ],
  },
  {
    college: 'College of Engineering (COE)',
    majors: [
      'Aerospace Engineering (BS)',
      'Biomedical Engineering (BS)',
      'Chemical Engineering (BS)',
      'Civil Engineering (BS)',
      'Computer Engineering (BS)',
      'Computer Engineering Technology',
      'Computer Science (BS)',
      'Construction Engineering Management (BS)',
      'Electrical Engineering (BS)',
      'Engineering Technology (BS)',
      'Mechanical Engineering (BS)',
    ],
  },
  {
    college: 'College of Health & Human Services (CHHS)',
    majors: [
      'Criminology and Criminal Justice (BS)',
      'Family and Consumer Sciences (BA) - Child Development and Family Studies',
      'Family and Consumer Sciences (BA) - Consumer Affairs',
      'Family and Consumer Sciences (BA) - Family Life Education',
      'Fashion Design (BA)',
      'Fashion Merchandising (BA)',
      'Health Care Administration (BS) - Healthcare Data Analytics',
      'Health Care Administration (BS) - Risk Management and Safety',
      'Health Science (BS) - Community Health Education',
      'Health Science (BS) - School Health Education',
      'Hospitality Management (BS)',
      'Kinesiology (BS) - Exercise Science',
      'Kinesiology (BS) - Fitness',
      'Kinesiology (BS) - Physical Education-Teacher Education',
      'Kinesiology (BS) - Sport Psychology and Leadership',
      'Nursing (BSN)',
      'Nutrition and Dietetics (BS)',
      'Recreation (BA)',
      'Recreation Therapy (BS)',
      'Social Work (BASW)',
      'Speech-Language Pathology (BA)',
    ],
  },
  {
    college: 'College of Liberal Arts (CLA)',
    majors: [
      'Africana Studies (BA)',
      'American Sign Language Linguistics & Deaf Culture (BA)',
      'American Studies (BA)',
      'Anthropology (BA)',
      'Asian and Asian American Studies (BA) - Asian Studies',
      'Asian and Asian American Studies (BA) - Asian American Studies',
      'Asian and Asian American Studies (BA) - Chinese Studies',
      'Asian and Asian American Studies (BA) - Japanese',
      'Chicano and Latino Studies (BA)',
      'Classics (BA) - Greek and Greek Civilization',
      'Communication Studies (BA) - Communication, Culture, and Public Affairs',
      'Communication Studies (BA) - Interpersonal and Organizational Communication',
      'Comparative World Literature (BA)',
      'Economics (BA) - Business Economics',
      'Economics (BA) - Mathematical Economics and Economic Theory',
      'English (BA) - Creative Writing',
      'English (BA) - English Education',
      'English (BA) - Literature',
      'English (BA) - Rhetoric and Composition',
      'English (BA) - Special Emphasis',
      'Environmental Science and Public Policy (BA/BS)',
      'French & Francophone Studies (BA)',
      'Geography (BA/BS)',
      'German (BA)',
      'Global Studies (BA)',
      'History (BA)',
      'Human Development (BA)',
      'Italian Studies (BA)',
      'Journalism (BA)',
      'Linguistics (BA) - Teaching English to Speakers of Other Languages (TESOL)',
      'Linguistics (BA) - Translation Studies',
      'Modern Jewish Studies (BA)',
      'Philosophy (BA)',
      'Political Science (BA)',
      'Psychology (BA)',
      'Public Relations (BA)',
      'Religious Studies (BA)',
      'Sociology (BA)',
      'Spanish (BA)',
      "Women's, Gender, and Sexuality Studies (BA)",
    ],
  },
  {
    college: 'College of Natural Sciences & Mathematics (CNSM)',
    majors: [
      'Biochemistry (BA/BS)',
      'Biology (BS) - Biology Education',
      'Biology (BS) - General Biology',
      'Biology (BS) - Marine Biology',
      'Biology (BS) - Microbiology',
      'Biology (BS) - Molecular Cell Biology and Physiology',
      'Biology (BS) - Zoology, Botany, and Ecology',
      'Chemistry (BA/BS)',
      'Earth Systems (BS)',
      'Geology (BS)',
      'Applied Data Science (BS)',
      'Materials Science (BS)',
      'Mathematics (BS) - Applied Mathematics',
      'Mathematics (BS) - Applied Statistics',
      'Mathematics (BS) - Mathematics Education',
      'Physics (BS) - Materials Science',
    ],
  },
]

export const MAJOR_OPTIONS = MAJOR_GROUPS.flatMap((group) => group.majors)

export function buildMajorGroups(rows: MajorRow[]): MajorGroup[] {
  const grouped = new Map<string, string[]>()

  for (const row of rows) {
    const college = row.college?.trim()
    const majorName = row.major_name?.trim()
    if (!college || !majorName) continue

    const majors = grouped.get(college) ?? []
    majors.push(majorName)
    grouped.set(college, majors)
  }

  return Array.from(grouped.entries()).map(([college, majors]) => ({
    college,
    majors,
  }))
}
