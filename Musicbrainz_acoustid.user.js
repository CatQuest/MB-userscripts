// ==UserScript==
// @name          Musicbrainz: Compare AcoustIDs easier!
// @version       2024.10.13
// @description   Displays AcoustID fingerprints in more places at MusicBrainz.
// @grant         none
// @downloadURL   https://github.com/otringal/MB-userscripts/raw/master/Musicbrainz_acoustid.user.js
// @updateURL     https://github.com/otringal/MB-userscripts/raw/master/Musicbrainz_acoustid.user.js
// @match         *://*.musicbrainz.org/artist/*/recordings*
// @match         *://*.musicbrainz.org/artist/*/*edits
// @match         *://*.musicbrainz.org/collection/*/*
// @match         *://*.musicbrainz.org/edit/*
// @match         *://*.musicbrainz.org/recording/*
// @match         *://*.musicbrainz.org/release-group/*
// @match         *://*.musicbrainz.org/release/*
// @match         *://*.musicbrainz.org/search/*
// @match         *://*.musicbrainz.org/user/*/edits*
// @match         *://*.musicbrainz.org/user/*/votes*
// @exclude       *musicbrainz.org/release/*/edit
// @exclude       *musicbrainz.org/release/*/edit-relationships
// @icon          https://acoustid.org/static/acoustid-wave-12.png
// @run-at        document-end
// ==/UserScript==
//
//	This script was partially copy/pasted together from the following userscripts:
//	* https://bitbucket.org/acoustid/musicbrainz-acoustid
//	* http://userscripts.org/scripts/show/176866 by th1rtyf0ur
//
/*----/ USER SETTINGS /----*/
var enableMiniIcons = true; //set to "true" to enable the mini AcoustID icons on the release and artist/recordings pages, "false" to disable.
var enableAcoustList = true; //set to "true" to enable the AcoustID lists on edit pages, "false" to disable.
var addShowHideButton = true; //set to "true" to enable the "show/hide" buttons, "false" to disable.
var alwaysShowIds = 5; //number of ids always shown on the AcoustID list (per recording).
var numCharacters = 6; //number of characters shown of the AcoudID code.
/*----/ USER SETTINGS /----*/
//
  var hiddenlength = 0;
  var css = document.createElement("style");
    css.setAttribute("type", "text/css");
    css.innerHTML = "td > a[href^='//acoustid.org/track/'] > code {display: inline-block; white-space: nowrap; overflow-x: hidden; width: "+ numCharacters +"ch}";
    css.innerHTML += ".hidelist, .hidelist + br {display: none;} .showids span {white-space: nowrap; margin: 0.4em 0em; padding: 0.1em 0.3em; font-size: smaller; text-transform: uppercase; font-weight: 600; background-color: rgba(250, 200, 35, 0.5); cursor: pointer;}";
    document.head.appendChild(css);

  function extractRecordingMBID(link) {
    if (link !== undefined) {
      var parts = link.href.split('/');
      if (parts[3] == 'recording') {
        return parts[4]; //return MBID
      }
    }
  }
  function findAcoustIDsByMBIDsInternal(mbids, result, callback) {
    var remaining_mbids = [
    ];
    if (mbids.length > 50) {
      remaining_mbids = mbids.slice(50);
      mbids = mbids.slice(0, 50);
    }
    $.ajax({
      url: '//api.acoustid.org/v2/track/list_by_mbid?format=jsonp&batch=1&jsoncallback=?',
      dataType: 'json',
      data: {
        'mbid': mbids
      },
      traditional: true,
      success: function (json) {
        for (var i = 0; i < json.mbids.length; i++) {
          result.mbids.push(json.mbids[i]);
        }
        if (remaining_mbids.length > 0) {
          findAcoustIDsByMBIDsInternal(remaining_mbids, result, callback);
        }
        else {
          callback(result);
        }
      }
    });
  }
  function findAcoustIDsByMBIDs(mbids, callback) {
    if (mbids.length == 0) {
      return;
    }
    var result = {
      'mbids': [
      ]
    }
    findAcoustIDsByMBIDsInternal(mbids, result, callback);
  }
  function updateArtistRecordingsPage() {
    var mbids = [
    ];
    $('.tbl tr td + td:not(.video) a').each(function (i, link) {
      var mbid = extractRecordingMBID(link);
      if (mbid !== undefined) {
        mbids.push(mbid);
      }
    });
    if (mbids.length == 0) {
      return;
    }
    findAcoustIDsByMBIDs(mbids, function (json) {
      var has_acoustids = {
      };
      for (var i = 0; i < json.mbids.length; i++) {
        has_acoustids[json.mbids[i].mbid] = json.mbids[i].tracks.length > 0;
      }
      $('.tbl tr td + td:not(.video)').each(function (i, td) {
        var mbidtocheck = extractRecordingMBID($(td).find('a').get(0));
        if (mbidtocheck === undefined) {
          return;
        }
        if (has_acoustids[mbidtocheck]) {
          //ADD acoustid id img + hover over img acoustid comparison
          for (var b = 0; b < json.mbids.length; b++) {
            if (json.mbids[b].mbid == mbidtocheck) {
              $.each(json.mbids[b].tracks, function () {
                var a = $('<a href="#"><img src="//acoustid.org/static/acoustid-wave-12.png" title="' + this.id + '" alt="AcoustID" /></a>');
                a.attr('href', '//acoustid.org/track/' + this.id);
                a.css({
                  'float': 'right'
                });
                $(td).find('a:first').after(a);
              });
            }
          }
        }
      });
    });
  }
  // Adds Acoustid to merge recordings edits
  function updateMergeOrEdits(path) {
    var mbids = [
    ];
    $('.details.merge-recordings thead tr th:nth-child(2)').after('<th>AcoustIDs</th>');
    $('.tbl tr td:nth-child(1) a').each(function (i, link) {
      var mbid = extractRecordingMBID(link);
      if (mbid !== undefined) {
        mbids.push(mbid);
      }
    });
    if (mbids.length == 0) {
      return;
    }
    findAcoustIDsByMBIDs(mbids, function (json) {
      var has_acoustids = {
      };
      for (var i = 0; i < json.mbids.length; i++) {
        has_acoustids[json.mbids[i].mbid] = json.mbids[i].tracks.length > 0;
      }
      var classPath = ".details.merge-recordings ";
      $(''+classPath+'.tbl tr td:nth-child(1)').each(function (i, td) { //for each recording get mbid
        var tdRef = $(td).first().next();
        var mbidtocheck = extractRecordingMBID($(td).find('a').get(0));
        if (mbidtocheck === undefined) {
          return;
        }
      if (has_acoustids[mbidtocheck]) {
        var newtd = '<td>';
        for (var b = 0; b < json.mbids.length; b++) {
          if (json.mbids[b].mbid == mbidtocheck) {
            json.mbids[b].tracks.sort(function(z, x) {
              return z.id > x.id;
            });
              if (addShowHideButton && alwaysShowIds !=0 && json.mbids[b].tracks.length > alwaysShowIds){
                hiddenlength = json.mbids[b].tracks.length - alwaysShowIds;
                var breaknum = 0;
                $.each(json.mbids[b].tracks, function () {
                    if (breaknum < alwaysShowIds) {
                      breaknum++;
                      newtd += '<a href="//acoustid.org/track/' + this.id + '"><code>' + this.id + '</code></a><br/>';
                    }
                    else newtd += '<a class="hidelist" href="//acoustid.org/track/' + this.id + '"><code>' + this.id + '</code></a><br/>';
                });
                newtd += "<div class='showids allids'><span>show all (+"+hiddenlength+")</span></div>";
                showhide();
                break;
              }
              else {
                $.each(json.mbids[b].tracks, function () {
                  newtd += '<a href="//acoustid.org/track/' + this.id + '"><code>' + this.id + '</code></a><br/>';
                });
                newtd += '</td>';
              }
          }
        }
        $(tdRef).after(newtd);
      }
      else $(tdRef).after('<td></td>');
      });
    });
  }
  function showhide(){
    $(document).off("click").on("click", ".showids", function(){
        if($(this).hasClass("allids")){
            $(this).addClass("lessids").removeClass("allids").children(0).html("show less");
          }
        else if($(this).hasClass("lessids")){
            hiddenlength = $(this).siblings('.hidelist').length+1;
            $(this).addClass("allids").removeClass("lessids").children(0).html("show all (+"+(hiddenlength-1)+")");
        }
        $(this).siblings('.hidelist, .hidelist + br').toggle();
    });
  }
  function updatePages(path) {
    if (enableMiniIcons && (path.match(/artist\/[A-Fa-f0-9-]{36}\/recordings/) || path.match(/release\/[A-Fa-f0-9-]{36}(\/(disc\/\d+)?)?(#.*)?$/))) {
        updateArtistRecordingsPage();
      return;
    }
    else if (enableAcoustList && (path.match(/edit/) || path.match(/votes/))) {
      updateMergeOrEdits(path);
      return;
    }
  }
updatePages(window.location.href);
