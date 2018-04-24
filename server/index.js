const Hapi = require('hapi');
const fetch = require('node-fetch');

const server = Hapi.server({
  host:'127.0.0.1',
  port:3001
});

server.route({
  method:'GET',
  path:'/',
  handler: async function(request, reply) {
    function getNode(url) {
      return fetch(url)
        .then(ans => ans.json())
        .then(
          data => {
            console.log(data);
            return data.node;
          },
          err => {
            console.log(err);
            return err;
          }
        );
    }

    //request.logger.info('In handler %s', request.path);
    let userComments = [];
    let node = '';
    let url = `https://api.bitbucket.org/1.0/` +
                `repositories/` +
                `${request.query.acountname}/` +
                `${request.query.slug}/` +
                `src/` +
                `${request.query.branch}/?` +
                `access_token=${request.query.access_token}`;
    node = await getNode(url);

    console.log(node);
    let notUserRepError;

    url = `https://api.bitbucket.org/1.0/repositories/` +
                  `${request.query.acountname}/` +
                  `${request.query.slug}/` +
                  `changesets/` +
                  `${node}/` +
                  `comments?` +
                  `access_token=${request.query.access_token}`;
    await fetch(url)
      .then(
        ans => {
          try {
            return ans.json()
          } catch(err) {
            return new Error('not valid user')
          }
        }
      )
      .then(
        comments => {
          console.log('comments' + '\n');
          console.log(comments);
          userComments = comments;
        },
        err => {
          console.log(err);
          notUserRepError = err;
        }
      );

    console.log('ms' + notUserRepError)
    if (notUserRepError !== undefined) {
      return notUserRepError;
    }
    if (userComments === undefined) {
      return [];
    }

    userComments = userComments.filter(comment => {
      if (comment.content.includes('TODO') ||
            comment.content.includes('PROCESS') ||
            comment.content.includes('DONE')){
        return true;
      }
      return false;
    });

    console.log('userComments' + '\n' + userComments);

    userComments = userComments.map(comment => {
      return {
        discription: comment.content.replace(/TODO|PROCESS|DONE/, '') +
                      ' in ' + comment.filename,
        status: comment.content.match(/TODO|PROCESS|DONE/)[0].toLowerCase(),
        commentHash: comment.filename_hash
      }
    });



    let previousTasks = JSON.parse(request.query.tasks);

    if (previousTasks !== []) {
      console.log(previousTasks)
      //console.log(userComments);
      //console.log(previousTasks);
      userComments = userComments.filter(comment => {
        return !previousTasks.some(el => {
          if (el.filename_hash === comment.commentHash &&
                el.discription === comment.discription) {
            console.log('true');
            return true;
          }
          return false;
        });
      })
    }

    return userComments;
  }
});

// Start the server
async function start() {

  try {
    await server.start();
  }
  catch (err) {
    console.log(err);
    process.exit(1);
  }

  console.log('Server running at:', server.info.uri);
};

start();
