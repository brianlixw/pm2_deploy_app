'use strict';

module.exports = function(Playerinfo) {
  Playerinfo.checkInfo = function(idlist,cb){
    idlist=Array(idlist);
    if (idlist.length!=0 || idlist[0]!=undefined){
      Playerinfo.updateAll({"id":{inq:idlist}},{ischeck:true},function(err,cacheRecord){
        cb(err,cacheRecord);
      });
    }
    else cb(null,'idlist is empty');
  };

  Playerinfo.remoteMethod(
    'checkInfo',
    {
      accepts: [{arg: 'idlist', type: 'string'}],
      returns: {arg: 'checkInfo:', type: 'string'},
      http: {path: '/checkInfo', verb: 'post'}
    }
  );
};
