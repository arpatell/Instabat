const usernameInput = document.getElementById('usernameInput');
const username = usernameInput.value;
var loadingSpinner = document.getElementById('loading');
var progressElement = document.getElementById('progress');


let followers = [{ username: ""}];
let followings = [{ username: ""}];
let unfollowers = [{ username: ""}];

followers = [];
followings = [];
unfollowers = [];

document.addEventListener('DOMContentLoaded', function() {
  var getUnfollowersButton = document.getElementById('getUnfollowers');
  getUnfollowersButton.addEventListener('click', async function() {
    loadingSpinner.style.display = 'block';
    progressElement.innerHTML = '';

    const usernameInput = document.getElementById('usernameInput');
    const username = usernameInput.value;

    progressElement.innerHTML = 'Compiling followers...';

    const userQueryRes = await fetch(
      `https://www.instagram.com/web/search/topsearch/?query=${username}`
    );

    const userQueryJson = await userQueryRes.json();

    const userId = userQueryJson.users[0].user.pk;

    let after = null;
    let has_next = true;

    while (has_next) {
      await fetch(
        `https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=` +
          encodeURIComponent(
            JSON.stringify({
              id: userId,
              include_reel: true,
              fetch_mutual: true,
              first: 50,
              after: after,
            })
          )
      )
        .then((res) => res.json())
        .then((res) => {
          has_next = res.data.user.edge_followed_by.page_info.has_next_page;
          after = res.data.user.edge_followed_by.page_info.end_cursor;
          followers = followers.concat(
            res.data.user.edge_followed_by.edges.map(({ node }) => {
              return {
                username: node.username,
              };
            })
          );
        });
    }

    progressElement.innerHTML = 'Compiling following...';

    after = null;
    has_next = true;

    while (has_next) {
      await fetch(
        `https://www.instagram.com/graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=` +
          encodeURIComponent(
            JSON.stringify({
              id: userId,
              include_reel: true,
              fetch_mutual: true,
              first: 50,
              after: after,
            })
          )
      )
        .then((res) => res.json())
        .then((res) => {
          has_next = res.data.user.edge_follow.page_info.has_next_page;
          after = res.data.user.edge_follow.page_info.end_cursor;
          followings = followings.concat(
            res.data.user.edge_follow.edges.map(({ node }) => {
              return {
                username: node.username,
              };
            })
          );
        });
    }

    progressElement.innerHTML = 'Comparing lists...';

    unfollowers = followings.filter((following) => {
      return !followers.find(
        (follower) => follower.username === following.username
      );
    });
    loadingSpinner.style.display = 'none';
    progressElement.innerHTML = '';

    var csvContent = "data:text/csv;charset=utf-8,";
    unfollowers.forEach(function(unfollower) {
      var unfollowerLink = `https://www.instagram.com/${unfollower.username}`;
      csvContent += `${unfollowerLink}\n`;
    });

    var encodedUri = encodeURI(csvContent);

    var downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", encodedUri);
    downloadLink.setAttribute("download", "unfollowers.csv");
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);

    downloadLink.click();
    document.body.removeChild(downloadLink);
  });
});