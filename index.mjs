import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { Octokit } from "@octokit/rest";
import { differenceInCalendarDays } from 'date-fns'
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";

const MyOctokit = Octokit.plugin(throttling, retry);

const octokit = new MyOctokit({
  auth: `token ${process.env.GITHUB_TOKEN}`,
  throttle: {
    onRateLimit: (retryAfter, options) => {
      octokit.log.warn(
        `Request quota exhausted for request ${options.method} ${options.url}`
      );

      // Retry twice after hitting a rate limit error, then give up
      if (options.request.retryCount <= 2) {
        console.log(`Retrying after ${retryAfter} seconds!`);
        return true;
      }
    },
    onAbuseLimit: (retryAfter, options) => {
      // does not retry, only logs a warning
      octokit.log.warn(
        `Abuse detected for request ${options.method} ${options.url}`
      );
    },
  },
});

const owner = "sourcegraph"
const repo = "sourcegraph"
const prs = [];
const days = 30;

// Get all PRs
console.log('Getting PRs...');
try {
  for await (const response of octokit.paginate.iterator(
    octokit.rest.pulls.list,
    {
      owner,
      repo,
      direction: "desc",
      sort: "created",
      state: "all",
      per_page: 100
    }
  )) {
    // We only care about the last X days
    if (!response.data) { console.log('err: no data'); }

    const lastPR = response.data[response.data.length - 1];
    const daysSinceLastPR = differenceInCalendarDays(new Date(), new Date(lastPR.created_at));

    if (daysSinceLastPR < days) {
      prs.push(...response.data);
    } else {
      const filteredPRs = response.data.filter(pr => differenceInCalendarDays(new Date(), new Date(pr.created_at)) <= days);
      prs.push(...filteredPRs);
      break;
    }
  }
} catch(e) {
  console.log(e);
  process.exit(1);
}

// For each PR, get all the comments
console.log('Getting comments...');
try {
  for await (const pr of prs) {
    const comments = [];
    for await (const response of octokit.paginate.iterator(
      octokit.rest.issues.listComments,
      {
        owner,
        repo,
        issue_number: pr.number,
        direction: "desc",
        sort: "created",
        per_page: 100
      }
    )) {
      comments.push(...response.data);
    }
    pr._comments = comments;
  }
} catch(e) {
  console.log(e);
  process.exit(1);
}

// For each PR, get all the reviews
console.log('Getting reviews...');
try {
  for await (const pr of prs) {
    const reviews = [];
    for await (const response of octokit.paginate.iterator(
      octokit.rest.pulls.listReviews,
      {
        owner,
        repo,
        pull_number: pr.number,
        direction: "desc",
        sort: "created",
        per_page: 100
      }
    )) {
      reviews.push(...response.data);
    }
    pr._reviews = reviews;
  }  
}
catch (e) {
  console.log(e);
  process.exit(1);
}

// For each PR, get all the review comments
console.log('Getting review comments...');
try {
  for await (const pr of prs) {
    const reviewComments = [];
    for await (const response of octokit.paginate.iterator(
      octokit.rest.pulls.listReviewComments,
      {
        owner,
        repo,
        pull_number: pr.number,
        direction: "desc",
        sort: "created",
        per_page: 100
      }
    )) {
      reviewComments.push(...response.data);
    }
    pr._reviewComments = reviewComments;
  }  
}
catch (e) {
  console.log(e);
  process.exit(1);
}

// Write to a file
writeFileSync(
  resolve('./results.json'),
  JSON.stringify(prs, null, 2),
  {
    flag: 'w'
  }
);