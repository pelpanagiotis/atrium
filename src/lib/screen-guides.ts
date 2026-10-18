// Screen guides explain each screen the first time a user opens it.
//
// To change a guide, edit its copy here. Then bump its `version` so users who
// already dismissed it see the updated guide once. Adding a screen means adding
// an entry to GUIDES and to DETAIL_GUIDES if it has a detail page. The guide
// test fails when a console route has no guide.

export type ScreenGuide = {
  id: string;
  version: number;
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
};

export const GUIDES = {
  home: {
    id: "home",
    version: 1,
    title: "Welcome to Atrium",
    intro:
      "Atrium is one place for your personal and work projects. Native tasks are edited here. Tasks from Linear, Jira, GitHub, GitLab, and Gitea stay owned by those providers, and Atrium keeps a synchronized copy.",
    sections: [
      {
        heading: "What this page shows",
        body: "Counts for tasks that need attention, are due this week, are blocked, or were finished in the last seven days. Select a count to open the matching filtered task list.",
      },
      {
        heading: "Filter by source",
        body: "Use Sources to show only Atrium tasks or tasks from one connected provider.",
      },
      {
        heading: "Start from here",
        body: "Use the plus button in the header to create a task or a project. Use the sync button to check connection health.",
      },
    ],
  },
  projects: {
    id: "projects",
    version: 1,
    title: "Projects",
    intro:
      "Projects group related tasks. Native projects are created and edited in Atrium. Projects linked from a provider mirror that provider's issues.",
    sections: [
      {
        heading: "Choose which projects to see",
        body: "Switch between Active, Archived, and All projects with the status control.",
      },
      {
        heading: "Create or link a project",
        body: "Use the plus button to create a native project. To mirror an external project, connect the provider first on the Integrations page, then link a project from there.",
      },
    ],
  },
  project: {
    id: "project",
    version: 1,
    title: "Project",
    intro:
      "A project page shows the status of its tasks, the latest updates, and the task list. Changes to native tasks save here. Provider-linked tasks follow the provider's rules.",
    sections: [
      {
        heading: "Status at a glance",
        body: "The counts show tasks that need attention, are in progress, or are blocked. Select one to filter the task list.",
      },
      {
        heading: "Settings, mappings, and publishing",
        body: "Open the settings section to change the project name or nickname, map provider fields to Atrium fields, or publish changes back to a provider. Milestones on external projects stay with the provider.",
      },
    ],
  },
  tasks: {
    id: "tasks",
    version: 1,
    title: "Tasks",
    intro:
      "Every task you can see across your workspace, from native projects and connected providers. Native tasks are edited here. Provider tasks show where they came from and only offer actions that the provider supports.",
    sections: [
      {
        heading: "Find tasks",
        body: "Search by text, or narrow the list with the status, priority, project, and source filters. Switch between List and Board views at the top right.",
      },
      {
        heading: "Change several tasks",
        body: "Select tasks with the checkboxes, then choose a status or priority in the bulk bar and apply it to the selection.",
      },
      {
        heading: "Create a task",
        body: "Use New task to add one to a native project. Viewers can read tasks. Members and above can edit them.",
      },
    ],
  },
  task: {
    id: "task",
    version: 1,
    title: "Task",
    intro:
      "A task holds its details, its discussion, and its source. Native tasks save here. For tasks from a provider, the source is shown and only the supported changes are offered.",
    sections: [
      {
        heading: "Edit details",
        body: "Edit the title, description, status, and priority from the form. Due dates and assignees appear where the provider supports them.",
      },
      {
        heading: "Comments",
        body: "Use the comments section to record progress or questions for your team.",
      },
      {
        heading: "Open in the provider",
        body: "For a provider task, the Open button goes to the original issue, where the provider's own rules apply.",
      },
    ],
  },
  schedule: {
    id: "schedule",
    version: 1,
    title: "Schedule",
    intro:
      "Schedule shows when work is due. It replaces the old Calendar page, which now redirects here.",
    sections: [
      {
        heading: "Month view",
        body: "Each day lists the tasks due on it. Use the arrows to move between months.",
      },
      {
        heading: "Timeline view",
        body: "Switch to Timeline at the top to see tasks laid out over time, which helps spot overlapping work.",
      },
    ],
  },
  chats: {
    id: "chats",
    version: 1,
    title: "Chats",
    intro:
      "Chats shows today's messages from the Slack channels you invited the bot to. It only reads messages. It does not post in Slack.",
    sections: [
      {
        heading: "Connect Slack",
        body: "An owner or admin adds a free Slack bot token on the Integrations page, then invites the bot into the channels to show here.",
      },
      {
        heading: "Refresh",
        body: "Reload the page to see the latest messages.",
      },
    ],
  },
  notes: {
    id: "notes",
    version: 1,
    title: "Notes",
    intro:
      "Notes shows markdown from an Obsidian vault that syncs through Self-hosted LiveSync. Atrium reads the vault. It does not edit your notes.",
    sections: [
      {
        heading: "Find a note",
        body: "Search or filter by folder, then select a note to read it.",
      },
      {
        heading: "Connect a vault",
        body: "Connect the vault on the Integrations page, either from a folder on this host or through the remote vault bridge. Refresh after LiveSync updates the vault.",
      },
    ],
  },
  integrations: {
    id: "integrations",
    version: 1,
    title: "Integrations",
    intro:
      "Connect the tools where your work already lives. Atrium syncs issues into projects and keeps them up to date.",
    sections: [
      {
        heading: "Connect a provider",
        body: "Pick a provider and connect it with OAuth, or paste an access token if the provider has no OAuth app set up. Only owners and admins can connect providers.",
      },
      {
        heading: "Link projects",
        body: "Open a connection to choose which provider projects to mirror into Atrium. Sync health for each connection appears there too.",
      },
      {
        heading: "MCP for AI tools",
        body: "The MCP section creates a personal token for AI clients such as Claude or Cursor. Copy the token when it is shown. It is not shown again.",
      },
    ],
  },
  integration: {
    id: "integration",
    version: 1,
    title: "Connection",
    intro:
      "This page is one provider connection. It lists the projects the provider returned and lets you link them into Atrium.",
    sections: [
      {
        heading: "Link a provider project",
        body: "Choose a project from the list to mirror its issues into Atrium. Linking starts an initial sync right away.",
      },
      {
        heading: "Test or disconnect",
        body: "Test the connection to confirm the credentials still work. Disconnecting revokes the connection and stops syncing.",
      },
    ],
  },
  sync: {
    id: "sync",
    version: 1,
    title: "Sync",
    intro:
      "Sync shows whether connected providers are keeping up, and what needs your attention.",
    sections: [
      {
        heading: "Connection health",
        body: "Each connected provider shows its latest status.",
      },
      {
        heading: "Conflicts",
        body: "A conflict means the same field changed in Atrium and in the provider. Resolve it to choose which value to keep.",
      },
      {
        heading: "Failed jobs",
        body: "Jobs that failed too many times are listed here. Owners and admins can retry them once the cause is fixed.",
      },
    ],
  },
  workspaces: {
    id: "workspaces",
    version: 1,
    title: "Workspaces",
    intro:
      "A workspace keeps its projects, tasks, and people separate from other workspaces. Contexts group workspaces, such as Personal and Work.",
    sections: [
      {
        heading: "People and roles",
        body: "Owners and admins can invite people and change their roles. Owner, admin, member, and viewer each allow a different level of access.",
      },
      {
        heading: "Invitations",
        body: "An invitation is a link, not an email. Copy it when it is shown. The link is not shown again.",
      },
      {
        heading: "Contexts",
        body: "Contexts group your workspaces, so you can keep personal and work tasks apart. Add or rename contexts from this page.",
      },
    ],
  },
  audit: {
    id: "audit",
    version: 1,
    title: "Audit",
    intro:
      "The audit log records permission changes, integration changes, and other important actions in this workspace. It never stores secrets.",
    sections: [
      {
        heading: "Who can see it",
        body: "Only owners and admins can read the audit log.",
      },
    ],
  },
  settings: {
    id: "settings",
    version: 1,
    title: "Settings",
    intro:
      "Your profile, appearance, and notification choices. They apply only to your account.",
    sections: [
      {
        heading: "Profile and password",
        body: "Change your display name or password here.",
      },
      {
        heading: "Appearance",
        body: "Pick light or dark mode, a color palette, and whether animations play.",
      },
      {
        heading: "Notifications",
        body: "Choose whether to hear about sync errors and tasks assigned to you.",
      },
    ],
  },
  search: {
    id: "search",
    version: 1,
    title: "Search",
    intro:
      "Search finds projects and tasks in the current workspace by name and text.",
    sections: [
      {
        heading: "Search",
        body: "Type at least two characters. Projects match by name. Tasks match by title or description. Only the selected workspace is searched.",
      },
    ],
  },
} satisfies Record<string, ScreenGuide>;

export type GuideId = keyof typeof GUIDES;

// Pages whose first path segment is a list screen, but whose second segment
// is one record. Each maps to its own guide.
const DETAIL_GUIDES: Record<string, GuideId> = {
  projects: "project",
  tasks: "task",
  integrations: "integration",
};

const LIST_GUIDE_IDS = new Set<string>(Object.keys(GUIDES));

export function guideIdForPath(pathname: string): GuideId | null {
  const [first, second] = pathname.split("/").filter(Boolean);
  if (!first) return null;
  if (second && DETAIL_GUIDES[first]) return DETAIL_GUIDES[first];
  return LIST_GUIDE_IDS.has(first) ? (first as GuideId) : null;
}
