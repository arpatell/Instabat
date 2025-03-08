document.addEventListener('DOMContentLoaded', function () {
  const getUnfollowersButton = document.getElementById('getUnfollowers');
  const loadingSpinner = document.getElementById('loading');
  const progressElement = document.getElementById('progress');
  const usernameInput = document.getElementById('usernameInput');

  getUnfollowersButton.addEventListener('click', async function () {
    const username = usernameInput.value.trim();
    if (!username) {
      alert("Please enter a username.");
      return;
    }

    loadingSpinner.style.display = 'block';
    progressElement.innerHTML = 'Fetching user ID...';

    try {
      const userQueryRes = await fetch(
        `https://www.instagram.com/web/search/topsearch/?query=${username}`
      );
      const userQueryJson = await userQueryRes.json();
      const userId = userQueryJson.users[0].user.pk;

      progressElement.innerHTML = 'Fetching followers... (0 processed)';
      const followers = await fetchAllUsers(userId, 'followers', 'followers');

      progressElement.innerHTML = 'Fetching followings... (0 processed)';
      const followings = await fetchAllUsers(userId, 'followings', 'followings');

      progressElement.innerHTML = 'Comparing lists...';
      const unfollowers = followings.filter(following => 
        !followers.some(follower => follower.username === following.username)
      );

      progressElement.innerHTML = 'Data compiled!';
      const csvContent = generateCSV(unfollowers);
      createDownloadButton(csvContent);
    } catch (error) {
      console.error("Error:", error);
      progressElement.innerHTML = 'An error occurred. Please try again.';
    } finally {
      loadingSpinner.style.display = 'none';
    }
  });

  async function fetchAllUsers(userId, type, label) {
    let users = [];
    let after = null;
    let hasNext = true;
    let processedCount = 0;

    const queryHash = type === 'followers' 
      ? 'c76146de99bb02f6415203be841dd25a' 
      : 'd04b0a864b4b54837c0d870b0e77e076';

    while (hasNext) {
      const res = await fetch(
        `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=` +
          encodeURIComponent(
            JSON.stringify({
              id: userId,
              include_reel: true,
              fetch_mutual: true,
              first: 50,
              after: after,
            })
          )
      );
      const data = await res.json();
      const edges = type === 'followers' 
        ? data.data.user.edge_followed_by.edges 
        : data.data.user.edge_follow.edges;

      users = users.concat(edges.map(edge => ({ username: edge.node.username })));
      hasNext = type === 'followers' 
        ? data.data.user.edge_followed_by.page_info.has_next_page 
        : data.data.user.edge_follow.page_info.has_next_page;
      after = type === 'followers' 
        ? data.data.user.edge_followed_by.page_info.end_cursor 
        : data.data.user.edge_follow.page_info.end_cursor;

      processedCount += edges.length;
      progressElement.innerHTML = `Fetching ${label}... (${processedCount} processed)`;

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return users;
  }

  function generateCSV(unfollowers) {
    const csvContent = "data:text/csv;charset=utf-8," + 
      unfollowers.map(unfollower => `https://www.instagram.com/${unfollower.username}`).join("\n");
    return encodeURI(csvContent);
  }

  function createDownloadButton(csvContent) {
    const existingButton = document.getElementById('downloadButton');
    if (existingButton) {
      existingButton.remove();
    }

    const downloadButton = document.createElement('button');
    downloadButton.id = 'downloadButton';
    downloadButton.textContent = 'Download Unfollowers CSV';
    document.body.appendChild(downloadButton);

    downloadButton.addEventListener('click', () => {
      const downloadLink = document.createElement('a');
      downloadLink.setAttribute('href', csvContent);
      downloadLink.setAttribute('download', 'unfollowers.csv');
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    });
  }
});