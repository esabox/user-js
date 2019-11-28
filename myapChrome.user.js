/* eslint-disable max-len */
// ==UserScript==
// @name           AutoPagerize
// @namespace      http://swdyh.yu.to/
// @description    loading next page and inserting into current page.
// @include        http://*
// @include        https://*
// @exclude        https://mail.google.com/*
// @exclude        http://b.hatena.ne.jp/*
// @exclude        http://www.facebook.com/plugins/like.php*
// @exclude        http://api.tweetmeme.com/button.js*
// @version        0.0.66
// @updateURL      https://userscripts.org/scripts/source/8551.user.js
// @icon           http://autopagerize.net/img/icons/icon_032.png
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_addStyle
// @grant          GM_log
// @grant          GM_xmlhttpRequest
// @grant          GM_registerMenuCommand
// ==/UserScript==

// AutoPagerize
// loading next page and inserting into current page.
// http://autopagerize.net/

//
// It doesn't work in Greasemonkey any longer.
//
// this script based on
// GoogleAutoPager(http://la.ma.la/blog/diary_200506231749.htm) and
// estseek autopager(http://la.ma.la/blog/diary_200601100209.htm).
// thanks to ma.la.
//
// Released under the GPL license
// http://www.gnu.org/copyleft/gpl.html
//

(function() {

    let DEBUG = false
    let BASE_REMAIN_HEIGHT = 400
    let MIN_REQUEST_INTERVAL = 2000
    let FORCE_TARGET_WINDOW = true // FIXME config
    let SITEINFO_IMPORT_URLS = [
        'http://wedata.net/databases/AutoPagerize/items.json',
    ]
    let SITEINFO = [
        /* sample
        {
            url:          'http://(.*).google.+/(search).+',
            nextLink:     'id("navbar")//td[last()]/a',
            pageElement:  '//div[@id="res"]/div',
            exampleUrl:   'http://www.google.com/search?q=nsIObserver',
        },
        */
        /* template
        {
            url:          '',
            nextLink:     '',
            pageElement:  '',
            exampleUrl:   '',
        },
        */
    ]
    let MICROFORMAT = {
        url: '.*',
        nextLink: '//a[@rel="next"] | //link[@rel="next"]',
        insertBefore: '//*[contains(@class, "autopagerize_insert_before")]',
        pageElement: '//*[contains(@class, "autopagerize_page_element")]',
    }

    function AutoPager(info) {
        this.pageNum = 1
        this.info = info
        this.state = settings.disable ? 'disable' : 'enable'
        let self = this
        let url = this.getNextURL(info.nextLink, document, location.href)

        if (!url) {
            debug('getNextURL returns null.', info.nextLink)
            return
        }
        if (info.insertBefore) {
            this.insertPoint = getFirstElementByXPath(info.insertBefore)
        }

        if (!this.insertPoint) {
            var lastPageElement = getElementsByXPath(info.pageElement).pop()
            if (lastPageElement) {
                this.insertPoint = lastPageElement.nextSibling ||
                    lastPageElement.parentNode.appendChild(document.createTextNode(' '))
            }
        }

        if (!this.insertPoint) {
            debug('insertPoint not found.', lastPageElement, info.pageElement)
            return
        }

        this.requestURL = url
        this.loadedURLs = {}
        this.loadedURLs[location.href] = true
        let toggle = function() {self.stateToggle()}
        this.toggle = toggle
        this.scroll = function() {self.onScroll()}
        window.addEventListener('scroll', this.scroll, false)

        this.initMessageBar()
        extension.addListener('toggleRequest', function(res) {
            if (ap) {
                ap.toggle()
            }
        })
        extension.addListener('enableRequest', function(res) {
            if (ap) {
                ap.enable()
            }
        })
        extension.addListener('disableRequest', function(res) {
            if (ap) {
                ap.disable()
            }
        })
        extension.postMessage('launched', {url: location.href})
        if (Extension.isSafari()) {
            document.addEventListener('contextmenu', function(event) {
                safari.self.tab.setContextMenuEventUserInfo(event, 'launched')
            }, false)
        }

        let scrollHeight = getScrollHeight()
        let bottom = getElementPosition(this.insertPoint).top ||
            this.getPageElementsBottom() ||
            (Math.round(scrollHeight * 0.8))
        this.remainHeight = scrollHeight - bottom + BASE_REMAIN_HEIGHT
        this.reqTime = new Date()
        this.onScroll()

        let that = this
        document.addEventListener('AutoPagerizeToggleRequest', function() {
            that.toggle()
        }, false)
        document.addEventListener('AutoPagerizeEnableRequest', function() {
            that.enable()
        }, false)
        document.addEventListener('AutoPagerizeDisableRequest', function() {
            that.disable()
        }, false)
        document.addEventListener('AutoPagerizeUpdateSettingsRequest', function() {
            extension.postMessage('settings', {}, function(res) {
                settings = res
            })
        }, false)
    }

    AutoPager.prototype.getPageElementsBottom = function() {
        try {
            let elems = getElementsByXPath(this.info.pageElement)
            let bs = elems.map(function(i) {return getElementBottom(i)})
            return Math.max.apply(Math, bs)
        }
        catch (e) {}
    }

    AutoPager.prototype.initMessageBar = function() {
        let frame = document.createElement('iframe')
        frame.id = 'autopagerize_message_bar'
        frame.style.display = 'none'
        frame.style.position = 'fixed'
        frame.style.bottom = '0px'
        frame.style.left = '0px'
        frame.style.height = '25px'
        frame.style.border = '0px'
        frame.style.opacity = '0.8'
        frame.style.zIndex = '1000'
        frame.width = '100%'
        frame.scrolling = 'no'
        this.messageFrame = frame

        // no icon.
        let u = 'data:text/html;base64,PGh0bWw+CjxoZWFkPgo8c3R5bGU+CmJvZHkgewogIG1hcmdpbjogMDsKICBwYWRkaW5nOiA0cHggMCAwIDEwcHg7CiAgY29sb3I6ICNmZmY7CiAgYmFja2dyb3VuZC1jb2xvcjogIzAwMDsKICBmb250LXNpemU6IDEycHg7CiAgdGV4dC1hbGlnbjogY2VudGVyOwp9CmltZyB7CiAgdmVydGljYWwtYWxpZ246IHRvcDsKfQo8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5PkxvYWRpbmcuLi48L2JvZHk+CjwvaHRtbD4K'
        if (settings['extension_path']) {
            u = settings['extension_path'] + 'loading.html'
        }
        else if (settings['loading_html']) {
            u = settings['loading_html']
        }
        this.messageFrame.src = u
        document.body.appendChild(frame)
    }

    AutoPager.prototype.onScroll = function() {
        let scrollHeight = Math.max(document.documentElement.scrollHeight,
            document.body.scrollHeight)
        let remain = scrollHeight - window.innerHeight - window.scrollY
        if (this.state == 'enable' && remain < this.remainHeight) {
            this.request()
        }
    }

    AutoPager.prototype.stateToggle = function() {
        if (this.state == 'enable') {
            this.disable()
        }
        else {
            this.enable()
        }
    }

    AutoPager.prototype.enable = function() {
        this.state = 'enable'
    }

    AutoPager.prototype.disable = function() {
        this.state = 'disable'
    }

    AutoPager.prototype.request = function() {
        if (!this.requestURL || this.lastRequestURL == this.requestURL) {
            return
        }
        let self = this
        let now = new Date()
        if (this.reqTime && now - this.reqTime < MIN_REQUEST_INTERVAL) {
            setTimeout(function() {self.onScroll()}, MIN_REQUEST_INTERVAL)
            return
        }
        else {
            this.reqTime = now
        }

        this.lastRequestURL = this.requestURL
        this.showLoading(true)
        let f = ('responseURL' in new XMLHttpRequest()) ? loadWithXHR : loadWithIframe
        f(this.requestURL, function(doc, url) {
            self.load(doc, url)
        }, function(err) {
            self.error()
        })
    }

    AutoPager.prototype.showLoading = function(sw) {
        if (sw) {
            if (this.messageFrame && settings['display_message_bar']) {
                this.messageFrame.style.display = 'block'
            }
        }
        else {
            if (this.messageFrame) {
                this.messageFrame.style.display = 'none'
            }
        }
    }

    AutoPager.prototype.load = function(htmlDoc, url) {
        if (url && !isSameDomain(url)) {
            this.error()
            return
        }
        try {
            var page = getElementsByXPath(this.info.pageElement, htmlDoc)
            var url = this.getNextURL(this.info.nextLink, htmlDoc, this.requestURL)
        }
        catch (e) {
            this.error()
            return
        }

        if (!page || page.length < 1) {
            debug('pageElement not found.', this.info.pageElement)
            this.terminate()
            return
        }

        if (this.loadedURLs[this.requestURL]) {
            debug('page is already loaded.', this.requestURL, this.info.nextLink)
            this.terminate()
            return
        }

        this.loadedURLs[this.requestURL] = true
        page = this.addPage(htmlDoc, page)
        AutoPager.filters.forEach(function(i) {
            i(page)
        })
        this.requestURL = url
        this.showLoading(false)
        this.onScroll()
        if (!url) {
            debug('nextLink not found.', this.info.nextLink, htmlDoc)
            this.terminate()
        }
        let ev = document.createEvent('Event')
        ev.initEvent('GM_AutoPagerizeNextPageLoaded', true, false)
        document.dispatchEvent(ev)
    }

    AutoPager.prototype.addPage = function(htmlDoc, page) {
        let HTML_NS = 'http://www.w3.org/1999/xhtml'
        let hr = document.createElementNS(HTML_NS, 'hr')
        let p = document.createElementNS(HTML_NS, 'p')
        hr.setAttribute('class', 'autopagerize_page_separator')
        p.setAttribute('class', 'autopagerize_page_info')
        let self = this

        if (getRoot(this.insertPoint) != document) {
            let lastPageElement = getElementsByXPath(this.info.pageElement).pop()
            if (lastPageElement) {
                this.insertPoint = lastPageElement.nextSibling ||
                    lastPageElement.parentNode.appendChild(document.createTextNode(' '))
            }
        }

        if (page[0] && /tr/i.test(page[0].tagName)) {
            let insertParent = this.insertPoint.parentNode
            let colNodes = getElementsByXPath('child::tr[1]/child::*[self::td or self::th]', insertParent)

            let colums = 0
            for (let i = 0, l = colNodes.length; i < l; i++) {
                let col = colNodes[i].getAttribute('colspan')
                colums += parseInt(col, 10) || 1
            }
            let td = document.createElement('td')
            // td.appendChild(hr)
            td.appendChild(p)
            let tr = document.createElement('tr')
            td.setAttribute('colspan', colums)
            tr.appendChild(td)
            insertParent.insertBefore(tr, this.insertPoint)
        }
        else {
            this.insertPoint.parentNode.insertBefore(hr, this.insertPoint)
            this.insertPoint.parentNode.insertBefore(p, this.insertPoint)
        }

        let aplink = document.createElement('a')
        aplink.className = 'autopagerize_link'
        aplink.href = this.requestURL
        aplink.appendChild(document.createTextNode(String(++this.pageNum)))
        p.appendChild(document.createTextNode('page: '))
        p.appendChild(aplink)

        return page.map(function(i) {
            let pe = document.importNode(i, true)
            self.insertPoint.parentNode.insertBefore(pe, self.insertPoint)
            let ev = document.createEvent('MutationEvent')
            ev.initMutationEvent('AutoPagerize_DOMNodeInserted', true, false,
                self.insertPoint.parentNode, null,
                self.requestURL, null, null)
            pe.dispatchEvent(ev)
            return pe
        })
    }

    AutoPager.prototype.getNextURL = function(xpath, doc, url) {
        let nextLink = getFirstElementByXPath(xpath, doc)
        if (nextLink) {
            let nextValue = nextLink.getAttribute('href') ||
                nextLink.getAttribute('action') || nextLink.value
            if (nextValue.match(/^http(s)?:/)) {
                return nextValue
            }
            else {
                let base = getFirstElementByXPath('//base[@href]', doc)
                return resolvePath(nextValue, (base ? base.href : url))
            }
        }
    }

    AutoPager.prototype.terminate = function() {
        window.removeEventListener('scroll', this.scroll, false)
        let self = this
        setTimeout(function() {
            if (self.icon) {
                self.icon.parentNode.removeChild(self.icon)
            }
            if (self.messageFrame) {
                let mf = self.messageFrame
                mf.parentNode.removeChild(mf)
            }
        }, 1500)
    }

    AutoPager.prototype.error = function() {
        window.removeEventListener('scroll', this.scroll, false)
        if (this.messageFrame) {
            let mf = this.messageFrame
            let u = 'data:text/html;base64,PGh0bWw+CjxoZWFkPgo8c3R5bGU+CmJvZHkgewogIG1hcmdpbjogMDsKICBwYWRkaW5nOiA0cHggMCAwIDEwcHg7CiAgY29sb3I6ICNmZmY7CiAgYmFja2dyb3VuZC1jb2xvcjogI2EwMDsKICBmb250LXNpemU6IDEycHg7CiAgdGV4dC1hbGlnbjogY2VudGVyOwp9CmltZyB7CiAgdmVydGljYWwtYWxpZ246IHRvcDsKfQo8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5PkVycm9yITwvYm9keT4KPC9odG1sPgo='
            if (settings['extension_path']) {
                u = settings['extension_path'] + 'error.html'
            }
            else if (settings['error_html']) {
                u = settings['error_html']
            }
            mf.src = u
            mf.style.display = 'block'
            setTimeout(function() {
                if (mf) {
                    mf.parentNode.removeChild(mf)
                }
            }, 3000)
        }
    }
    AutoPager.filters = []
    AutoPager.launchAutoPager = function(list) {
        if (list.length == 0) {
            return
        }
        for (let i = 0; i < list.length; i++) {
            try {
                if (ap) {
                    return
                }
                else if (!location.href.match(list[i].url)) {
                }
                else if (!getFirstElementByXPath(list[i].nextLink)) {
                    // FIXME microformats case detection.
                    // limiting greater than 12 to filter microformats like SITEINFOs.
                    if (list[i].url.length > 12) {
                        debug('nextLink not found.', list[i].nextLink)
                    }
                }
                else if (!getFirstElementByXPath(list[i].pageElement)) {
                    if (list[i].url.length > 12) {
                        debug('pageElement not found.', list[i].pageElement)
                    }
                }
                else {
                    ap = new AutoPager(list[i])
                    return
                }
            }
            catch (e) {
                continue
            }
        }
    }

    // firefox about:addon(http://localhost/extensions-dummy/discoveryURL)
    // Error: Permission denied to access property 'href'
    if (Extension.isFirefox()) {
        try {
            if (window.location.href != window.parent.location.href) {
                return
            }
        }
        catch (e) {
            return
        }
    }
    else if (window != window.parent) {
        return
    }

    if (Extension.isFirefox()) {
        fixResolvePath()
    }

    if (typeof (window.AutoPagerize) == 'undefined') {
        window.AutoPagerize = {}
        window.AutoPagerize.addFilter = function(f) {
            AutoPager.filters.push(f)
        }
        window.AutoPagerize.launchAutoPager = AutoPager.launchAutoPager
        let ev = document.createEvent('Event')
        ev.initEvent('GM_AutoPagerizeLoaded', true, false)
        document.dispatchEvent(ev)
    }

    var settings = {}
    var ap = null
    var extension = new Extension()
    extension.postMessage('settings', {}, function(res) {
        settings = res
        extension.postMessage('siteinfo', {url: location.href}, function(res) {
            if (!settings['exclude_patterns'] || !isExclude(settings['exclude_patterns'])) {
                let f = function() {
                    AutoPager.launchAutoPager(SITEINFO)
                    AutoPager.launchAutoPager(res)
                    AutoPager.launchAutoPager([MICROFORMAT])
                }
                f()
                !ap && setTimeout(f, 2000)
            }
        })
    })
    extension.addListener('updateSettings', function(res) {
        settings = res
    })

    // new google search sucks!
    if (location.href.match('^http://[^.]+\.google\.(?:[^.]{2,3}\.)?[^./]{2,3}/.*(&fp=)')) {
        let to = location.href.replace(/&fp=.*/, '')
        // console.log([location.href, to])
        location.href = to
    }
    // fix youtube thumbnails
    // http://www.youtube.com/results?search_query=a
    if ((/^https?:\/\/www.youtube.com\/results.+/).test(location.href)) {
        let youtubeSearchShowThumbnalFilter = function(nodes) {
            nodes.forEach(function(i) {
                Array.prototype.slice.call(
                    i.querySelectorAll('img[data-thumb]')
                ).forEach(function(i) {
                    if ((/\.gif$/).test(i.src) && i.dataset.thumb) {
                        i.src = i.dataset.thumb
                    }
                })
            })
        }
        AutoPager.filters.push(youtubeSearchShowThumbnalFilter)
    }

    // utility functions.
    function getElementsByXPath(xpath, node) {
        let nodesSnapshot = getXPathResult(xpath, node,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE || 7)
        let data = []
        for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
            data.push(nodesSnapshot.snapshotItem(i))
        }
        return data
    }

    function getFirstElementByXPath(xpath, node) {
        let result = getXPathResult(xpath, node,
            XPathResult.FIRST_ORDERED_NODE_TYPE || 9)
        return result.singleNodeValue
    }

    function getXPathResult(xpath, node, resultType) {
        var node = node || document
        let doc = node.ownerDocument || node
        let resolver = doc.createNSResolver(node.documentElement || node)
        // Use |node.lookupNamespaceURI('')| for Opera 9.5
        let defaultNS = node.lookupNamespaceURI(null)

        if (defaultNS) {
            const defaultPrefix = '__default__'
            xpath = addDefaultPrefix(xpath, defaultPrefix)
            let defaultResolver = resolver
            resolver = function(prefix) {
                return (prefix == defaultPrefix)
                    ? defaultNS : defaultResolver.lookupNamespaceURI(prefix)
            }
        }
        return doc.evaluate(xpath, node, resolver, resultType, null)
    }

    function addDefaultPrefix(xpath, prefix) {
        const tokenPattern = /([A-Za-z_\u00c0-\ufffd][\w\-.\u00b7-\ufffd]*|\*)\s*(::?|\()?|(".*?"|'.*?'|\d+(?:\.\d*)?|\.(?:\.|\d+)?|[\)\]])|(\/\/?|!=|[<>]=?|[\(\[|,=+-])|([@$])/g
        const TERM = 1, OPERATOR = 2, MODIFIER = 3
        let tokenType = OPERATOR
        prefix += ':'
        function replacer(token, identifier, suffix, term, operator, modifier) {
            if (suffix) {
                tokenType =
                    (suffix == ':' || (suffix == '::' &&
                        (identifier == 'attribute' || identifier == 'namespace')))
                        ? MODIFIER : OPERATOR
            }
            else if (identifier) {
                if (tokenType == OPERATOR && identifier != '*') {
                    token = prefix + token
                }
                tokenType = (tokenType == TERM) ? OPERATOR : TERM
            }
            else {
                tokenType = term ? TERM : operator ? OPERATOR : MODIFIER
            }
            return token
        }
        return xpath.replace(tokenPattern, replacer)
    }

    function debug() {
        if (typeof DEBUG != 'undefined' && DEBUG && console.log.apply) {
            console.log.apply(console, arguments)
        }
    }

    function getElementPosition(elem) {
        let offsetTrail = elem
        let offsetLeft = 0
        let offsetTop = 0
        while (offsetTrail) {
            offsetLeft += offsetTrail.offsetLeft
            offsetTop += offsetTrail.offsetTop
            offsetTrail = offsetTrail.offsetParent
        }
        offsetTop = offsetTop || null
        offsetLeft = offsetLeft || null
        return {left: offsetLeft, top: offsetTop}
    }

    function getElementBottom(elem) {
        let c_style = document.defaultView.getComputedStyle(elem, '')
        let height = 0
        let prop = ['height', 'borderTopWidth', 'borderBottomWidth',
            'paddingTop', 'paddingBottom',
            'marginTop', 'marginBottom']
        prop.forEach(function(i) {
            let h = parseInt(c_style[i])
            if (typeof h == 'number') {
                height += h
            }
        })
        let top = getElementPosition(elem).top
        return top ? (top + height) : null
    }

    function getScrollHeight() {
        return Math.max(document.documentElement.scrollHeight,
            document.body.scrollHeight)
    }

    function isSameDomain(url) {
        if (url.match(/^\w+:/)) {
            return location.host == url.split('/')[2]
        }
        else {
            return true
        }
    }

    function isSameBaseUrl(urlA, urlB) {
        return (urlA.replace(/[^/]+$/, '') == urlB.replace(/[^/]+$/, ''))
    }

    function resolvePath(path, base) {
        if (path.match(/^https?:\/\//)) {
            return path
        }
        else if (path.match(/^\?/)) {
            return base.replace(/\?.+$/, '') + path
        }
        else if (path.match(/^[^\/]/)) {
            return base.replace(/[^/]+$/, '') + path
        }
        else {
            return base.replace(/([^/]+:\/\/[^/]+)\/.*/, '\$1') + path
        }
    }

    function fixResolvePath() {
        if (resolvePath('', 'http://resolve.test/') == 'http://resolve.test/') {
            return
        }
        // A workaround for WebKit and Mozilla 1.9.2a1pre,
        // which don't support XML Base in HTML.
        // https://bugs.webkit.org/show_bug.cgi?id=17423
        // https://bugzilla.mozilla.org/show_bug.cgi?id=505783
        let XML_NS = 'http://www.w3.org/XML/1998/namespace'
        let baseElement = document.createElementNS(null, 'base')
        let pathElement = document.createElementNS(null, 'path')
        baseElement.appendChild(pathElement)
        resolvePath = function resolvePath_workaround(path, base) {
            baseElement.setAttributeNS(XML_NS, 'xml:base', base)
            pathElement.setAttributeNS(XML_NS, 'xml:base', path)
            return pathElement.baseURI
        }
    }

    function strip_html_tag(str) {
        let chunks = str.split(/(<html(?:[ \t\r\n][^>]*)?>)/)
        if (chunks.length >= 3) {
            chunks.splice(0, 2)
        }
        str = chunks.join('')
        chunks = str.split(/(<\/html[ \t\r\n]*>)/)
        if (chunks.length >= 3) {
            chunks.splice(chunks.length - 2)
        }
        return chunks.join('')
    }

    function wildcard2regep(str) {
        return '^' + str.replace(/([-()\[\]{}+?.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08').replace(/\*/g, '.*')
    }

    function isExclude(patterns) {
        let rr = /^\/(.+)\/$/
        let eps = (patterns || '').split(/[\r\n ]+/)
        for (let i = 0; i < eps.length; i++) {
            let reg = null
            if (rr.test(eps[i])) {
                reg = eps[i].match(rr)[1]
            }
            else {
                reg = wildcard2regep(eps[i])
            }
            if (eps[i].match(/[^\s+]/) && location.href.match(reg)) {
                return true
            }
        }
        return false
    }

    function loadWithXHR(url, callback, errback) {
        let req = new XMLHttpRequest()
        req.open('GET', url)
        req.responseType = 'document'
        req.addEventListener('load', function(event) {
            let doc = removeScripts(event.target.response)
            callback(doc, event.target.responseURL)
        })
        req.addEventListener('error', errback)
        req.send()
    }

    function loadWithIframe(url, callback, errback) {
        let iframe = document.createElement('iframe')
        iframe.sandbox = 'allow-same-origin'
        iframe.style.display = 'none'
        iframe.src = url
        document.body.appendChild(iframe)
        let contentload = function() {
            try {
                if (!iframe.contentDocument) {
                    errback()
                }
                else {
                    let loadedURL = iframe.contentWindow ? iframe.contentWindow.location.href : null
                    let doc = removeScripts(iframe.contentDocument)
                    callback(doc, loadedURL)
                }
                iframe.parentNode.removeChild(iframe)
            }
            catch (e) {
                errback()
            }
        }
        iframe.onload = contentload
        iframe.onerror = errback
    }

    function removeScripts(doc) {
        let ss = doc.querySelectorAll('script')
        for (let i = 0; i < ss.length; i++) {
            ss[i].parentNode.removeChild(ss[i])
        }
        return doc
    }

    function createHTMLDocumentByString(str) {
        if (document.documentElement.nodeName != 'HTML') {
            return new DOMParser().parseFromString(str, 'application/xhtml+xml')
        }
        let html = strip_html_tag(str)
        let htmlDoc
        try {
            // We have to handle exceptions since Opera 9.6 throws
            // a NOT_SUPPORTED_ERR exception for |document.cloneNode(false)|
            // against the DOM 3 Core spec.
            htmlDoc = document.cloneNode(false)
            htmlDoc.appendChild(htmlDoc.importNode(document.documentElement, false))
        }
        catch (e) {
            htmlDoc = document.implementation.createDocument(null, 'html', null)
        }
        let fragment = createDocumentFragmentByString(html)
        try {
            fragment = htmlDoc.adoptNode(fragment)
        }
        catch (e) {
            fragment = htmlDoc.importNode(fragment, true)
        }
        htmlDoc.documentElement.appendChild(fragment)
        return htmlDoc
    }

    function createDocumentFragmentByString(str) {
        let range = document.createRange()
        range.setStartAfter(document.body)
        return range.createContextualFragment(str)
    }

    function getRoot(element) {
        let limit = 1000
        for (let i = 0; i < limit; i++) {
            if (!element.parentNode) {
                return element
            }
            element = element.parentNode
        }
    }

})()
