import React, {Component} from 'react';
import CSSModules from 'react-css-modules';

import {DADATA_TOKEN} from 'config';
import {transformDadataSettlement, transformDadataAddress} from "utils/dadata";

import LoaderComponent from "components/elements/LoaderComponent/LoaderComponent";
import InputControl from "components/elements/InputControl/InputControl";

import styles from './GeoSearchControl.sss';


export const TYPE_SETTLEMENT = 'TYPE_SETTLEMENT';
export const TYPE_SETTLEMENT_AND_REGION = 'TYPE_SETTLEMENT_AND_REGION';
export const TYPE_ADDRESS = 'TYPE_ADDRESS';


@CSSModules(styles, {allowMultiple: true})
export default class GeoSearchControl extends Component {
  state = {
    value: this.props.value ? this.props.value : '',
    listVis: false
  };
  list = [];
  type = this.props.type ? this.props.type : TYPE_SETTLEMENT;
  inputElm;


  updateValue(value) {
    this.setState({value});
  }

  onKeyDown = event => {
    if (!event)
      event = window.event;
    event.stopPropagation();

    //Нажатие Enter
    if (event.keyCode == 13) {
      setTimeout(this.onOK, 1);
    //Нажатие Esc
    } else if (event.keyCode == 27) {
      if (this.state.listVis)
        this.setState({listVis: false});
      else
        setTimeout(this.close, 1);
    //Нажатие стрелки вниз
    } else if (event.keyCode == 40) {
      if (this.inputElm == document.activeElement) {
        console.log('!');
      }
    }
  };

  onItemClick = async data => {
    this.setState({
      value: data.main
    });

    if (this.type == TYPE_ADDRESS && !data.house) {
      setTimeout(() => {
        this.onChange(null, this.state.value + ', ');
        this.inputElm.focus();
      }, 1);
    }

    try {
      // узнаём по адресу геокоординаты
      const URL = `https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address`;
      const res = await fetch(URL, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Token ${DADATA_TOKEN}`
        },
        body: JSON.stringify({
          query: data.unrestricted,
          count: 1
        })
      });

      const resJson = await res.json();
      const resData = resJson.suggestions[0].data;
      data.geoLat = parseFloat(resData.geo_lat);
      data.geoLon = parseFloat(resData.geo_lon);

      if (this.type != TYPE_ADDRESS || data.house)
        this.props.onChange(data);
    } catch (e) {}
  };

  onBlur = () => {
    this.setState({listVis: false});
  };

  onFocus = () => {
    if (this.inputElm && this.type != TYPE_ADDRESS)
      this.inputElm.select();
  };

  onChange = async (event, value) => {
    if (this.props.showLoader)
      return;

    if (event)
      value = event.target.value;
    this.setState({value});

    try {
      const URL = `https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address`;
      let queryParams;
      switch (this.type) {
        case TYPE_SETTLEMENT:
          queryParams = {
            locations: [{
              "country": "Россия"
            }],
            "from_bound": {"value": "city"},
            "to_bound": {"value": "settlement"}
          };
          break;

        case TYPE_SETTLEMENT_AND_REGION:
          queryParams = {
            locations: [{
              "country": "Россия"
            }],
            "from_bound": {"value": "region"},
            "to_bound": {"value": "settlement"}
          };
          break;

        case TYPE_ADDRESS:
          queryParams = {
            "from_bound": {"value": "street"},
            "to_bound": {"value": "house"}
          };
          if (this.props.settlement.isSettlement)
            queryParams.locations = [{
              "settlement_fias_id": this.props.settlement.settlementFias
            }];
          else
            queryParams.locations = [{
              "city_fias_id": this.props.settlement.settlementFias
            }];
          break;
      }
      const res = await fetch(URL, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Token ${DADATA_TOKEN}`
        },
        body: JSON.stringify({
          query: value,
          count: 15,
          ...queryParams
        })
      });

      const resJson = await res.json();
      const {suggestions} = resJson;

      this.list = [];
      for (let suggestion of suggestions) {
        let data;
        switch (this.type) {
          case TYPE_SETTLEMENT:
            data = transformDadataSettlement(suggestion);
            break;

          case TYPE_SETTLEMENT_AND_REGION:
            data = transformDadataSettlement(suggestion, true);
            break;

          case TYPE_ADDRESS:
            data = transformDadataAddress(suggestion);
            break;
        }
        if (data)
          this.list.push(data);
      }

      this.setState({
        listVis: !!this.list.length
      });

      if (this.props.sendNull)
        this.props.onChange(null);
    } catch (e) {}
  };

  render() {
    const {placeholder, autoFocus, disabled, showLoader} = this.props;

    if (disabled)
      return <InputControl icon="lock"
                           placeholder={showLoader ? '' : placeholder}
                           value={showLoader ? '' : this.state.value}
                           dropdown={true}
                           readOnly={true} />;

    return (
      <div styleName="GeoSearchControl"
           onBlur={this.onBlur}
           onFocus={this.onFocus}
           onKeyDown={this.onKeyDown}>
        <input styleName="input"
               autoFocus={autoFocus}
               placeholder={showLoader ? '' : placeholder}
               value={showLoader ? '' : this.state.value}
               ref={elm => this.inputElm = elm}
               onChange={this.onChange} />
        {showLoader &&
          <div styleName="loader-wrapper">
            <LoaderComponent/>
          </div>
        }
        {this.state.listVis &&
          <div styleName="items">
            {this.list.map(item => {
              let hint = item.main;
              if (item.details)
                hint += `, ${item.details}`;
              
              return (
                <div onMouseDown={e => this.onItemClick(item)}
                     styleName="item"
                     key={item.unrestricted}>
                  <span title={hint}>{item.main}</span>
                  {item.details &&
                    <span styleName="item-details" title={hint}>, {item.details}</span>
                  }
                  <div styleName="ending"></div>
                </div>);
            })}
          </div>
        }
      </div>
    );
  }
}