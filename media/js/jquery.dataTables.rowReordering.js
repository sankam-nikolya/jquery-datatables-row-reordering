/**
 * @file jquery.dataTables.rowReordering.js
 * @version v1.3.0
 * 
 * @forked_from https://code.google.com/p/jquery-datatables-row-reordering/
 * 
 * History:
 * v1.3.0
 *  - new options
 *      - osSortableHandle, fnDrawCallback, fnGetPosFromTd, bDisableColumnSorting
 *  - change the names of some parameter in AJAX request ("fromPosition" --> "from", toPosition --> "to")
 *  - replace the direction strings in the AJAX request and in code:
 *          'forward' --> 'down' , 'backward' --> 'up'
 */
/*
 * !!!!!!!!!!!!!!!!!!!!!!!!!
 * !!   v1.2.0 README :   !!
 * !!!!!!!!!!!!!!!!!!!!!!!!!
 * 
 * File:        jquery.dataTables.rowReordering.js
 * Version:     1.2.0.
 * Author:      Jovan Popovic
 * 
 * Copyright 2013 Jovan Popovic, all rights reserved.
 *
 * This source file is free software, under either the GPL v2 license or a
 * BSD style license, as supplied with this software.
 * 
 * This source file is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.
 * 
 * Parameters:
 * @iIndexColumn     int         Position of the indexing column
 * @sURL             String      Server side page tat will be notified that order is changed
 * @iGroupingLevel   int         Defines that grouping is used
 */
(function ($) {

    "use strict";
    $.fn.rowReordering = function (options) {

        function fnCancelSorting(oTable, tbody, properties, iLogLevel, sMessage) {
            tbody.sortable('cancel');
            if(iLogLevel<=properties.iLogLevel){
                if(sMessage!= undefined){
                    properties.fnAlert('AJAX error: '+sMessage, "");
                }else{
                    properties.fnAlert("Row cannot be moved", "");
                }
            }
            properties.fnEndProcessingMode(oTable);
        }

        function fnGetState(oTable, sSelector, id) {
            var tr = $("#" + id, oTable);
            var iCurrentPosition = parseInt( properties.fnGetPosFromTd(  oTable.fnGetData(tr[0], properties.iIndexColumn)  ) );
            var iNewPosition = -1;
            var sDirection;
            var trPrevious = tr.prev(sSelector);
            if (trPrevious.length > 0) {
                iNewPosition = parseInt( properties.fnGetPosFromTd(  oTable.fnGetData(trPrevious[0], properties.iIndexColumn)  ) );
                if (iNewPosition < iCurrentPosition) {
                    iNewPosition = iNewPosition + 1;
                }
            } else {
                var trNext = tr.next(sSelector);
                if (trNext.length > 0) {
                    iNewPosition = parseInt( properties.fnGetPosFromTd(  oTable.fnGetData(trNext[0], properties.iIndexColumn)  ) );
                    if (iNewPosition > iCurrentPosition)//moved back
                        iNewPosition = iNewPosition - 1;
                }
            }
            if (iNewPosition < iCurrentPosition)
                sDirection = "up";
            else
                sDirection = "down";

            return { "sDirection": sDirection, "iCurrentPosition": iCurrentPosition, "iNewPosition": iNewPosition };
        }

        function fnMoveRows(oTable, sSelector, iCurrentPosition, iNewPosition, sDirection, id, sGroup) {
            var iStart = iCurrentPosition;
            var iEnd = iNewPosition;
            if (sDirection == "up") {
                iStart = iNewPosition;
                iEnd = iCurrentPosition;
            }

            $(oTable.fnGetNodes()).each(function () {
                if (sGroup != "" && $(this).attr("data-group") != sGroup)
                    return;
                var tr = this;
                var iRowPosition = parseInt(oTable.fnGetData(tr, properties.iIndexColumn));
                if (iStart <= iRowPosition && iRowPosition <= iEnd) {
                    if (tr.id == id) {
                        oTable.fnUpdate(iNewPosition,
                                        oTable.fnGetPosition(tr), // get row position in current model
                                        properties.iIndexColumn,
                                        false); // false = defer redraw until all row updates are done
                    } else {
                        if (sDirection == "up") {
                            oTable.fnUpdate(iRowPosition + 1,
                                        oTable.fnGetPosition(tr), // get row position in current model
                                        properties.iIndexColumn,
                                        false); // false = defer redraw until all row updates are done
                        } else {
                            oTable.fnUpdate(iRowPosition - 1,
                                        oTable.fnGetPosition(tr), // get row position in current model
                                        properties.iIndexColumn,
                                        false); // false = defer redraw until all row updates are done
                        }
                    }
                }
            });

            var oSettings = oTable.fnSettings();

            //Standing Redraw Extension
            //Author:   Jonathan Hoguet
            //http://datatables.net/plug-ins/api#fnStandingRedraw
            if (oSettings.oFeatures.bServerSide === false) {
                var before = oSettings._iDisplayStart;
                oSettings.oApi._fnReDraw(oSettings);
                //iDisplayStart has been reset to zero - so lets change it back
                oSettings._iDisplayStart = before;
                oSettings.oApi._fnCalculateEnd(oSettings);
            }
            //draw the 'current' page
            oSettings.oApi._fnDraw(oSettings);
        }

        //var oTable = this;

        var defaults = {
            /**
             * Disable the sorting in all columns
             * @var boolean
             */
            bDisableColumnSorting: true,
            /**
             * Column index, wich is sortable with drag and drop.
             * @var integer (0 based)
             */
            iIndexColumn: 0,
            // iStartPosition: 1,
            /**
             * URL for Ajax request.
             * @var string
             */
            sURL: null,
            /**
             * type of ajax request
             * @var string (POST|GET)
             */
            sRequestType: "POST",
            iGroupingLevel: 0,
            /**
             * Function for error displaying
             * @param message string
             * @param type string|int
             */
            fnAlert: function (message, type) { alert(message); },
            iLogLevel: 1,
            sDataGroupAttribute: "data-group",
            /**
             * Function that starts "Processing" mode
             * @var function
             * @param oTable Datatables instance
             */
            fnStartProcessingMode: function (oTable) {
                // Show "Processing..." dialog while some action is executing(Default function)
                if (oTable.fnSettings().oFeatures.bProcessing) $(".dataTables_processing").css('visibility', 'visible');
            },
            /**
             * Function that ends the "Processing" mode and returns the table in the normal state
             * @var function
             * @param oTable Datatables instance
             */
            fnEndProcessingMode: function (oTable) {
                // Hide "Processing..." dialog (Default function)
                if (oTable.fnSettings().oFeatures.bProcessing) $(".dataTables_processing").css('visibility', 'hidden');
            },
            fnUpdateAjaxRequest: jQuery.noop,

            osSortableHandle: false,
            fnDrawCallback: function(oSettings){},
            fnGetPosFromTd: function(sTdContent){return sTdContent;}
        };

        var properties = $.extend(defaults, options);

        // Return a helper with preserved width of cells (see Issue 9)
        var tableFixHelper = function(e, tr)
        {
          var $originals = tr.children();
          var $helper = tr.clone();
          $helper.children().each(function(index)
          {
            // Set helper cell sizes to match the original sizes
            $(this).width($originals.eq(index).width());
          });
          return $helper;
        };

        return this.each(function () {

            var oTable = $(this).dataTable();

            // Disable sorting in all columns, if necessary:
            if (properties.bDisableColumnSorting)
            {
                for (var i = 0; i < oTable.fnSettings().aoColumns.length; i++)
                {
                    oTable.fnSettings().aoColumns[i].bSortable = false;
                }
                oTable.fnDraw();
                $('.DataTables_sort_icon', oTable.get(0)).addClass('ui-helper-hidden-accessible');
            }

            // add plus fnPreDrawCallback function to the dataTable:
            oTable.fnSettings().aoPreDrawCallback.push({
                sName: 'rowreordering_predrawcallback',
                fn: function(oSettings){
                    if (properties.bDisableColumnSorting) return;

                    var oTable = $(this).dataTable();
                    var aaSorting = oTable.fnSettings().aaSorting;
                    var bSortedByIndexColumn =
                                aaSorting != null
                                    && aaSorting.length == 1
                                    && aaSorting[0][0] == properties.iIndexColumn
                                    //&& aaSorting[0][1] == "asc"
                    ;
                    oTable.fnSettings().bSortedByIndexColumn = bSortedByIndexColumn;
                    var $temp = $("tbody", oTable);
                    if ( bSortedByIndexColumn && ($temp.hasClass('ui-sortable') || $temp.data( 'ui-sortable' )) )
                        $temp.sortable('enable');
                    else
                        $temp.sortable('disable');
                }
            });

            // Add the user defined fnDrawCallback function:
            if (properties.fnDrawCallback)
                oTable.fnSettings().aoDrawCallback.push({
                    sName: 'rowreordering_drawcallback',
                    fn: properties.fnDrawCallback
                });

            $("tbody", oTable).disableSelection().sortable({
                cursor: "move",
                handle: properties.osSortableHandle,
                helper: tableFixHelper,
                update: function (event, ui) {
                    var $dataTable = oTable;
                    var tbody = $(this);
                    var sSelector = "tbody tr";
                    var sGroup = "";
                    if (properties.bGroupingUsed)
                    {
                        sGroup = $(ui.item).attr(properties.sDataGroupAttribute);
                        if(sGroup==null || sGroup==undefined)
                        {
                           fnCancelSorting($dataTable, tbody, properties, 3, "Grouping row cannot be moved");
                           return;
                        }
                        sSelector = "tbody tr[" + properties.sDataGroupAttribute + " ='" + sGroup + "']";
                    }

                    if (typeof ui.item.context.id == 'undefined' || ui.item.context.id == '')
                    {
                        window.alert('The sortable item has no ID attribute!!!');
                        console.error('The sortable item has no ID attribute!!!');
                        return;
                    }

                    var oState = fnGetState($dataTable, sSelector, ui.item.context.id);
                    if(oState.iNewPosition == -1)
                    {
                       fnCancelSorting($dataTable, tbody, properties,2);
                       return;
                    }

                    if (properties.sURL != null) {
                        properties.fnStartProcessingMode($dataTable);
                        var oAjaxRequest = {
                            url: properties.sURL,
                            type: properties.sRequestType,
                            data: { id: ui.item.context.id,
                                from: oState.iCurrentPosition,
                                to: oState.iNewPosition,
                                direction: oState.sDirection,
                                group: sGroup
                            },
                            success: function () {
                                fnMoveRows($dataTable, sSelector, oState.iCurrentPosition, oState.iNewPosition, oState.sDirection, ui.item.context.id, sGroup);
                                properties.fnEndProcessingMode($dataTable);
                            },
                            error: function (jqXHR) {
                                fnCancelSorting($dataTable, tbody, properties, 1, jqXHR.statusText);
                            }
                        };
                        properties.fnUpdateAjaxRequest(oAjaxRequest, properties, $dataTable);
                        $.ajax(oAjaxRequest);
                    } else {
                        fnMoveRows($dataTable, sSelector, oState.iCurrentPosition, oState.iNewPosition, oState.sDirection, ui.item.context.id, sGroup);
                    }

                }
            }); // END  $(...).sortable(...);

        });

    };
})(jQuery);
