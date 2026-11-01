// Application Configuration and Constants

export const CONFIG = {
    APP_NAME: 'CollabAI',
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'collabai_access_token',
        REFRESH_TOKEN: 'collabai_refresh_token',
        USER_ID: 'collabai_user_id',
        USER_NAME: 'collabai_user_name'
    },
    DEMO_USERS: [
        { id: 'alex-rivera', name: 'Alex Rivera', role: 'Frontend Lead', color: '#1a73e8' },
        { id: 'sarah-chen', name: 'Sarah Chen', role: 'AI Architect', color: '#7c3aed' },
        { id: 'david-kim', name: 'David Kim', role: 'Systems Engineer', color: '#059669' }
    ],
    TEMPLATES: [
        {
            id: 'blank',
            name: 'Blank Document',
            description: 'Start fresh with an empty canvas',
            content: ''
        },
        {
            id: 'proposal',
            name: 'Project Proposal',
            description: 'Architecture & technical roadmap',
            content: `# Project Proposal: Distributed Collaboration Engine\n\n## 1. Executive Summary\nThis document outlines the architecture for real-time collaborative document editing with Operational Transformation.\n\n## 2. Key Objectives\n- Zero-collision concurrent document synchronization\n- Sub-50ms keystroke broadcast latency\n- Google Gemini AI semantic conflict resolution\n\n## 3. Architecture Overview\nClients connect via WebSockets to an Express/Socket.IO backend. Edits are transformed across operation histories before persistence in Redis and MongoDB.`
        },
        {
            id: 'meeting',
            name: 'Engineering Sync Notes',
            description: 'Team standup and action items',
            content: `# Weekly Engineering Sync\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:** Alex Rivera, Sarah Chen, David Kim\n\n## Agenda\n1. Review OT prefix/suffix diff benchmarks\n2. Dual persistence flush thresholds (Redis to MongoDB)\n3. Gemini 2.0 Flash conflict mediator integration\n\n## Action Items\n- [ ] Complete stress testing on concurrent deletions\n- [ ] Deploy staging Redis container\n- [ ] Verify JWT token refresh flow`
        }
    ]
};
