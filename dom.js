function addLoadEvent(func) {
     var oldonload = window.onload;
     
     if (typeof window.onload != 'function') {
          window.onload = func;
     } else {
          window.onload = function() {
               if (oldonload) {
                    oldonload();
               }
               func();
          };
     }
}


function displayValueToSpan() {
     var myAnchor = document.getElementById("display_hook");
     var mySpan = document.createElement("span");
     mySpan.innerHTML = env.empty([1, 2, 3]);
     myAnchor.parentNode.replaceChild(mySpan, myAnchor);
}

addLoadEvent(displayValueToSpan);