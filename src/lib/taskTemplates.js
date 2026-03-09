// Shared wedding task templates — used by TaskList.jsx and OrgDashboard template builder

export const TEMPLATES = [
  {
    period: '12+ Months Before',
    tasks: [
      { title: 'Set a wedding date',                        priority: 'high'   },
      { title: 'Establish your overall budget',             priority: 'high'   },
      { title: 'Create the initial guest list',             priority: 'high'   },
      { title: 'Book your ceremony venue',                  priority: 'high'   },
      { title: 'Book your reception venue',                 priority: 'high'   },
      { title: 'Consider hiring a wedding planner',         priority: 'medium' },
      { title: 'Research and shortlist photographers',      priority: 'medium' },
      { title: 'Announce engagement to family & friends',   priority: 'low'    },
    ],
  },
  {
    period: '9–12 Months Before',
    tasks: [
      { title: 'Book photographer & videographer',          priority: 'high'   },
      { title: 'Book caterer',                              priority: 'high'   },
      { title: 'Book officiant',                            priority: 'high'   },
      { title: 'Book live music or DJ',                     priority: 'high'   },
      { title: 'Send save-the-date cards',                  priority: 'high'   },
      { title: 'Start wedding dress / suit shopping',       priority: 'medium' },
      { title: 'Choose your wedding party',                 priority: 'medium' },
      { title: 'Book honeymoon travel',                     priority: 'medium' },
    ],
  },
  {
    period: '6–9 Months Before',
    tasks: [
      { title: 'Order wedding dress / suit',                priority: 'high'   },
      { title: 'Book florist',                              priority: 'high'   },
      { title: 'Book hair & makeup artist',                 priority: 'high'   },
      { title: 'Create wedding website',                    priority: 'medium' },
      { title: 'Build gift registry',                       priority: 'medium' },
      { title: 'Order bridesmaid dresses',                  priority: 'medium' },
      { title: 'Plan rehearsal dinner',                     priority: 'medium' },
      { title: 'Book hotel room block for guests',          priority: 'low'    },
    ],
  },
  {
    period: '3–6 Months Before',
    tasks: [
      { title: 'Send wedding invitations',                  priority: 'high'   },
      { title: 'Apply for marriage license',                priority: 'high'   },
      { title: 'Purchase wedding rings',                    priority: 'high'   },
      { title: 'Finalize catering menu & headcount',        priority: 'high'   },
      { title: 'Book wedding cake / desserts',              priority: 'high'   },
      { title: 'Plan ceremony program & readings',          priority: 'medium' },
      { title: 'Arrange guest transportation',              priority: 'medium' },
      { title: 'Start seating chart',                       priority: 'medium' },
    ],
  },
  {
    period: '1–3 Months Before',
    tasks: [
      { title: 'Final dress / suit fitting',                priority: 'high'   },
      { title: 'Confirm all vendors with final timeline',   priority: 'high'   },
      { title: 'Finalize seating chart',                    priority: 'high'   },
      { title: 'Write personal vows',                       priority: 'high'   },
      { title: 'Create detailed wedding day timeline',      priority: 'high'   },
      { title: 'Prepare final vendor payments',             priority: 'high'   },
      { title: 'Prepare cash tips for vendors',             priority: 'medium' },
      { title: 'Confirm rehearsal dinner details',          priority: 'medium' },
    ],
  },
  {
    period: 'Week Of',
    tasks: [
      { title: 'Confirm final headcount with caterer',      priority: 'high'   },
      { title: 'Pick up wedding dress / suit',              priority: 'high'   },
      { title: 'Attend wedding rehearsal',                  priority: 'high'   },
      { title: 'Distribute day-of timeline to wedding party', priority: 'high' },
      { title: 'Deliver decor & favors to venue',           priority: 'medium' },
      { title: 'Prepare wedding day emergency kit',         priority: 'medium' },
      { title: 'Pack honeymoon bags',                       priority: 'medium' },
      { title: 'Get a full night\'s sleep',                 priority: 'low'    },
    ],
  },
]

// Approximate offset_days for each period (negative = before wedding date)
export const PERIOD_OFFSETS = {
  '12+ Months Before': -365,
  '9–12 Months Before': -300,
  '6–9 Months Before': -210,
  '3–6 Months Before': -120,
  '1–3 Months Before': -45,
  'Week Of': -7,
}
