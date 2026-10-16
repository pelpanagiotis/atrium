export function projectDisplayName(project: {
  name: string;
  nickname?: string | null;
}): string {
  const nickname = project.nickname?.trim();
  return nickname || project.name;
}
