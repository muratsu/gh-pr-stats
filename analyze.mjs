import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { differenceInCalendarDays } from 'date-fns'

const jsonFile = readFileSync(resolve('./results.json'), 'utf-8');
const data = JSON.parse(jsonFile);

const totalPRs = data.length;

const successfulPRs = data.filter((pr) => pr.state === 'closed' && pr.merged_at !== null);
const successfulHumanPRs = successfulPRs.filter((pr) => pr.user.type === 'User');
const successfulBotPRs = successfulPRs.filter((pr) => pr.user.type === 'Bot');

const averageTimeToMerge = successfulPRs.reduce((acc, pr) => {
    const timeToMerge = differenceInCalendarDays(new Date(pr.merged_at), new Date(pr.created_at));
    return acc + timeToMerge;
}, 0) / successfulPRs.length;
const averageHumanTimeToMerge = successfulHumanPRs.reduce((acc, pr) => {
    const timeToMerge = differenceInCalendarDays(new Date(pr.merged_at), new Date(pr.created_at));
    return acc + timeToMerge;
}, 0) / successfulHumanPRs.length;
const averageBotTimeToMerge = successfulBotPRs.reduce((acc, pr) => {
    const timeToMerge = differenceInCalendarDays(new Date(pr.merged_at), new Date(pr.created_at));
    return acc + timeToMerge;
}, 0) / successfulBotPRs.length;


console.log(`Total PRs: ${totalPRs}`);
console.log(`All Successful PRs: ${successfulPRs.length} (${successfulHumanPRs.length} human, ${successfulBotPRs.length} bot)`);
console.log(`Average time to merge: ${averageTimeToMerge.toFixed(2)} days (${averageHumanTimeToMerge.toFixed(2)} human, ${averageBotTimeToMerge.toFixed(2)} bot)`);
