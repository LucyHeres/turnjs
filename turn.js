(function ($) {

console.log("branch newBranch")

    var TurnObj = function () {
        //默认配置
        this.defaultOpts = {
            fontSize: 14,
            pagePadding:[20,20,20,20],//上右下左
            lineHeight: 25,
            content: "",
            startPage: 0,
            when: null,
        };
        this.pages = [];
        this.lines = [];
        this.options = {};
        this.whoDOM;
        this.currPage = 0;
        this.cacheOptions = {};

    };

    TurnObj.prototype = {
        init: function (whoDOM, opts,isUpdate) {
            this.whoDOM = whoDOM;
            //配置 options
            this.options = $.extend({}, isUpdate?this.cacheOptions:this.defaultOpts, opts);
            this.cacheOptions = this.options;
            this.LINE_MAX = Math.floor((window.screen.height - (this.options.pagePadding[0]+this.options.pagePadding[2]))/ this.options.lineHeight);
            this.WORD_MAX = Math.floor((window.screen.width - (this.options.pagePadding[1]+this.options.pagePadding[3])) / this.options.fontSize),
            this._page(this.options.content);//所有页
            this._showPage(isUpdate?this.currPage:this.options.startPage);//第一次加载page
            this._addTouchEvent(this.whoDOM);//添加touch事件
            
            return this;
        },
        
        //给文章段行、分页
        _page: function (content) {
            // console.log("line:" + this.LINE_MAX, "words:" + this.WORD_MAX);
            var LINES = [],
                PAGES = [],
                currline_length = 0,
                currline = "",
                isFirstLine = false,
                isJustify,
                symbolarray = ["，", "。", "”", "？", "！", "’", "：", ",", ".", "?", ":", "!"],
                symbolending = false;
            //正则修改content文本内容
            content = content.replace(/\r/g, "").replace(/\n[" ",\u3000]*/g, "\n")

            function _charlength(c) {
                var charCode = c.charCodeAt(0);
                if (charCode >= 0 && charCode <= 128)
                    return 1;
                else
                    return 2;
            };
            //分行
            for (var i = 0, len = content.length; i < len; i++) {
                var c = content[i];
                var c1 = content[i + 1];

                currline_length += _charlength(c);
                if (currline_length > this.WORD_MAX * 2 - 1 || c == "\n" || i == len - 1) {

                    if (currline_length - _charlength(c) >= this.WORD_MAX * 2 - 2) {
                        isJustify = true;
                    } else {
                        isJustify = false;
                    }

                    if (symbolarray.indexOf(c) != -1) {
                        currline += c;
                        if (symbolarray.indexOf(c1) != -1) {
                            currline += c1;
                            i += 1;
                        }
                        symbolending = true;
                    }

                    LINES.push({
                        text: currline ? currline : "&nbsp;",
                        isFirst: isFirstLine,
                        symbolending: symbolending,
                        len: currline.length,
                        isJustify: isJustify
                    });

                    if (c == "\n") {
                        currline_length = 4;
                        currline = "";
                        isFirstLine = true;
                    } else {
                        currline_length = symbolending ? 0 : _charlength(c);
                        currline = symbolending ? "" : c;
                        isFirstLine = false;
                        symbolending = false;
                    }

                    continue;
                }
                currline += c;
            }
            this.lines = LINES;
            //分页
            var page_num = Math.ceil(LINES.length / this.LINE_MAX);
            for (var i = 0; i < page_num; i++) {
                PAGES[i] = LINES.slice(i * this.LINE_MAX, i * this.LINE_MAX + this.LINE_MAX);
            }

            this.pages = PAGES;
            this._call("paged", this.pages.length);
        },
        _showPage: function (currPage) {
            var window_W = window.screen.width;
            var window_H = window.screen.height;
            var html_pages = "";
            function get_html_lines(lines) {
                if (!lines) return;
                var _tel = "";
                var classnames = "";
                for (var i = 0, len = lines.length; i < len; i++) {
                    classnames = lines[i].isJustify ? " isJustify" : "";
                    classnames += lines[i].isFirst ? " isFirstLine" : "";
                    _tel += "<div class='line " + classnames + "'>" + lines[i].text + "</div>";
                }
                return _tel;
            }
            html_pages += "<div class='page' style='left:0;width:" + window_W + "px;height:" + window_H + "px;'>"
                + get_html_lines(this.pages[currPage])
                + "</div><div class='nextPage'>"
                + "<div class='page' style='right:0;width:" + window_W + "px;height:" + window_H + "px;'>"
                + get_html_lines(this.pages[currPage + 1])
                + "</div></div><div class='flipBox'></div>";
            this.whoDOM.html(html_pages);
            this._css(this.whoDOM,this.options);
        },
        _css:function(whoDOM,opts){
            whoDOM.find(".page").css({
                "padding":opts.pagePadding[0]+"px "+opts.pagePadding[1]+"px "+opts.pagePadding[2]+"px "+opts.pagePadding[3]+"px", 
            });
            whoDOM.find(".page .line").css({
                "font-size":opts.fontSize+"px", 
                "height":opts.lineHeight+"px",
                "line-height":opts.lineHeight+"px",
            });
        },
        _addTouchEvent: function (whoDOM) {
            var self = this;
            whoDOM.off('touchstart').on("touchstart", ".page", function (e) {
                e.preventDefault();
                e.stopPropagation();
                var point = { x: e.originalEvent.touches[0].pageX, y: e.originalEvent.touches[0].pageY };
                console.log("touch");
                //todo: 防止多重点击

                //往后翻
                if (point.x > window.screen.width * 4 / 7) {
                    if (self.currPage >= self.pages.length - 1) { return; }//最后一页 
                    var speed = 0.5;
                    whoDOM.find(".flipBox").css("animation", "turn_next " + speed + "s linear");
                    whoDOM.find(".nextPage").css("animation", "turn_next_1 " + speed + "s linear");
                    whoDOM.find(".nextPage").on("animationend", function () {
                        self.currPage += 1;
                        self._showPage(self.currPage);
                        self._call("turned", self.currPage);
                    });

                    //往前翻
                } else if (point.x < window.screen.width * 3 / 7) {
                    console.log("rewrqew",self.currPage);
                    if (self.currPage < 1) return;
                    self.currPage -= 1;
                    self._showPage(self.currPage);
                    self._call("turned", self.currPage);
                    var speed = 0.3;
                    whoDOM.find(".flipBox").css("animation", "turn_back " + speed + "s linear alternate");
                    whoDOM.find(".nextPage").css("animation", "turn_back_1 " + speed + "s linear alternate");
                    //中间click
                } else {
                    self._call("clicked");
                }
            });
        },
        _call: function (fun_name, res) {
            this.options.when[fun_name] && this.options.when[fun_name](res ? res : null);
        }
    }

    $.fn.extend({
        turnOpts: function () {
            if (arguments[0] && typeof arguments[0] == 'object') {
                var turnObj = new TurnObj();
                return turnObj.init($(this[0]), arguments[0]);
            } else {
                throw new Error("传入的参数格式错误");
            }
        },
        updateTurnOpts:function(){
            if (arguments[0] && arguments[1] && typeof arguments[1] == 'object') {
                // console.log(arguments[0]);
                var turnObj = arguments[0];
                turnObj.init($(this[0]), arguments[1],true);
            } else {
                throw new Error("传入的参数格式错误");
            }
        }
    });


})(window.jQuery);