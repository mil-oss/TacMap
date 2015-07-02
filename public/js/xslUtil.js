/* 
 * Copyright (C) 2015 jdn
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var saxonloaded = false;
var xslproc = [];

var onSaxonLoad = function () {
    console.log('saxon loaded');
    saxonloaded = true;
};

function initXSL(name, xsl) {
    xslproc[name] = Saxon.newXSLT20Processor(Saxon.parseXML(xsl));
}

function doXSL(name, xmlsrc, params) {
    for (p = 0; p < params.length; p++) {
        xslproc[name].setParameter(null, params[p].name, params[p].value);
    }
    var result = xslproc[name].transformToFragment(Saxon.parseXML(xmlsrc));
    return Saxon.serializeXML(result);
}
